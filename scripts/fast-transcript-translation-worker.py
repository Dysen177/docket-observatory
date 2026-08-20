#!/usr/bin/env python3

import argparse
import gzip
import hashlib
import json
import logging
import os
import re
import signal
import sys
import time
import warnings
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


TRANSLATION_SCHEMA_VERSION = 5
CJK_RE = re.compile(r"[\u3400-\u9fff]")
MARKER_CODES = (
    "ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL",
    "INDIA", "JULIET", "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR", "PAPA",
    "QUEBEC", "ROMEO", "SIERRA", "TANGO", "UNIFORM", "VICTOR", "WHISKEY", "XRAY",
    "YANKEE", "ZULU",
)
MARKER_RE = re.compile(r"Z+X+Q[A-Z]+Z*X*Q", re.IGNORECASE)
SENTENCE_SPLIT_RE = re.compile(r".*?(?:[。！？!?；;]+|$)", re.DOTALL)
INLINE_ZH_TAG_RE = re.compile(r"\[\[zh:([^\]]*)\]\]", re.IGNORECASE)
PHONETIC_NOTE_RE = re.compile(r"([（(])\s*音\s*([）)])")


@dataclass
class TranslationJob:
    source: str
    protected: str
    markers: list
    translated: str | None = None
    engine: str | None = None


class ArgosEngine:
    name = "argos-translate-zh-en-1.9-ct2-int8"

    def __init__(self, root: Path, inter_threads: int, intra_threads: int):
        import ctranslate2
        from argostranslate.tokenizer import SentencePieceTokenizer

        self.tokenizer = SentencePieceTokenizer(root / "sentencepiece.model")
        self.translator = ctranslate2.Translator(
            str(root / "model"),
            device="cpu",
            compute_type="int8",
            inter_threads=inter_threads,
            intra_threads=intra_threads,
        )

    def translate(self, texts: list[str], batch_size: int) -> list[str]:
        if not texts:
            return []
        tokenized = [self.tokenizer.encode(text) for text in texts]
        results = self.translator.translate_batch(
            tokenized,
            beam_size=1,
            max_batch_size=batch_size,
            batch_type="tokens",
            replace_unknowns=True,
            max_decoding_length=512,
        )
        return [self.tokenizer.decode(result.hypotheses[0]).strip() for result in results]


class NllbEngine:
    name = "nllb-200-distilled-600m-ct2-int8"

    def __init__(self, root: Path, inter_threads: int, intra_threads: int):
        import ctranslate2
        from transformers import AutoTokenizer

        logging.getLogger("transformers.tokenization_utils_base").setLevel(logging.ERROR)
        warnings.filterwarnings("ignore", message="The tokenizer you are loading.*incorrect regex pattern.*")
        self.tokenizer = AutoTokenizer.from_pretrained(
            str(root),
            src_lang="zho_Hans",
            local_files_only=True,
        )
        self.translator = ctranslate2.Translator(
            str(root),
            device="cpu",
            compute_type="int8",
            inter_threads=inter_threads,
            intra_threads=intra_threads,
        )

    def translate(self, texts: list[str], batch_size: int, constrained=False) -> list[str]:
        if not texts:
            return []
        tokenized = [
            self.tokenizer.convert_ids_to_tokens(self.tokenizer.encode(text))
            for text in texts
        ]
        results = self.translator.translate_batch(
            tokenized,
            target_prefix=[["eng_Latn"] for _ in tokenized],
            beam_size=1,
            max_batch_size=batch_size,
            batch_type="tokens",
            max_decoding_length=256 if constrained else 512,
            repetition_penalty=1.12 if constrained else 1,
            no_repeat_ngram_size=6 if constrained else 0,
        )
        translated = []
        for result in results:
            tokens = result.hypotheses[0]
            if tokens and tokens[0] == "eng_Latn":
                tokens = tokens[1:]
            token_ids = self.tokenizer.convert_tokens_to_ids(tokens)
            translated.append(self.tokenizer.decode(token_ids, skip_special_tokens=True).strip())
        return translated


class HybridTranslator:
    def __init__(self, args, glossary):
        self.args = args
        self.glossary = glossary
        self.primary = ArgosEngine(
            Path(args.primary_model_root), args.inter_threads, args.intra_threads
        )
        self._fallback = None
        self.primary_chunks = 0
        self.fallback_chunks = 0
        self.spliced_chunks = 0
        self.constrained_chunks = 0
        self.static_chunks = 0
        self.fallback_reasons = {}

    @property
    def fallback(self):
        if self._fallback is None:
            self._fallback = NllbEngine(
                Path(self.args.fallback_model_root),
                self.args.inter_threads,
                self.args.intra_threads,
            )
        return self._fallback

    def translate_record(self, record, progress_callback):
        fields = [normalize_translation_input(record.get("title") or "")]
        fields.extend(
            normalize_translation_input(segment.get("text") or "")
            for segment in record.get("segments", [])
        )
        jobs = []
        plans = []

        for field in fields:
            plan = []
            for joiner, piece in split_text(field, self.args.max_chunk_chars):
                if not CJK_RE.search(piece):
                    plan.append((joiner, piece, None))
                    self.static_chunks += 1
                    continue
                protected, markers = protect_terms(piece, self.glossary)
                if not CJK_RE.search(protected):
                    restored, marker_ok = restore_terms(protected, markers)
                    if not marker_ok:
                        raise ValueError("Glossary-only text did not restore all protected terms")
                    plan.append((joiner, restored, None))
                    self.static_chunks += 1
                    continue
                job_index = len(jobs)
                jobs.append(TranslationJob(piece, protected, markers))
                plan.append((joiner, None, job_index))
            plans.append(plan)

        for block_start in range(0, len(jobs), self.args.block_size):
            block = jobs[block_start : block_start + self.args.block_size]
            self._translate_block(block)
            progress_callback(
                min(len(jobs), block_start + len(block)),
                len(jobs),
                self.primary_chunks,
                self.fallback_chunks,
                self.spliced_chunks,
            )

        translated_fields = []
        for plan in plans:
            pieces = []
            for joiner, static_text, job_index in plan:
                text = static_text if job_index is None else jobs[job_index].translated
                pieces.append(f"{joiner}{text or ''}")
            translated_fields.append(normalize_english("".join(pieces)))

        return translated_fields[0], translated_fields[1:]

    def _translate_block(self, jobs):
        primary_outputs = self.primary.translate(
            [job.protected for job in jobs], self.args.batch_size
        )
        fallback_indexes = []
        for index, (job, output) in enumerate(zip(jobs, primary_outputs)):
            self.primary_chunks += 1
            restored, marker_ok = restore_terms(output, job.markers)
            reason = translation_quality_issue(job.source, restored, marker_ok)
            if reason:
                self.fallback_reasons[reason] = self.fallback_reasons.get(reason, 0) + 1
                fallback_indexes.append(index)
            else:
                job.translated = restored
                job.engine = self.primary.name

        if not fallback_indexes:
            return

        fallback_outputs = self.fallback.translate(
            [jobs[index].protected for index in fallback_indexes],
            max(32, self.args.batch_size // 2),
        )
        for index, output in zip(fallback_indexes, fallback_outputs):
            job = jobs[index]
            self.fallback_chunks += 1
            restored, marker_ok = restore_terms(output, job.markers)
            reason = translation_quality_issue(job.source, restored, marker_ok)
            if reason:
                restored = self._translate_with_glossary_splice(job)
                reason = translation_quality_issue(job.source, restored, True, relaxed=True)
                if reason:
                    restored = self._translate_constrained(job)
                    reason = translation_quality_issue(job.source, restored, True, relaxed=True)
                    if reason:
                        raise ValueError(
                            f"Hybrid translation failed quality checks: {reason}; "
                            f"source={job.source[:160]!r}; output={restored[:240]!r}"
                        )
                    self.constrained_chunks += 1
                    job.engine = "nllb-constrained"
                else:
                    self.spliced_chunks += 1
                    job.engine = "nllb-glossary-splice"
            else:
                job.engine = self.fallback.name
            job.translated = restored

    def _translate_with_glossary_splice(self, job):
        return self._translate_spliced(job, constrained=False)

    def _translate_constrained(self, job):
        return self._translate_spliced(job, constrained=True)

    def _translate_spliced(self, job, constrained):
        marker_map = {marker: preferred for marker, preferred in job.markers}
        parts = re.split(r"(Z+X+Q[A-Z]+Z*X*Q)", job.protected, flags=re.IGNORECASE)
        translatable = [part for part in parts if part and part not in marker_map and CJK_RE.search(part)]
        translations = self.fallback.translate(translatable, 32, constrained=constrained) if translatable else []
        translated_iterator = iter(translations)
        output = []
        for part in parts:
            if not part:
                continue
            if part in marker_map:
                output.append(marker_map[part])
            elif CJK_RE.search(part):
                output.append(next(translated_iterator).strip())
            else:
                output.append(part)
        return normalize_english(" ".join(piece for piece in output if piece))


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--cache-root", required=True)
    parser.add_argument("--progress-path", required=True)
    parser.add_argument("--glossary-json", required=True)
    parser.add_argument("--primary-model-root", required=True)
    parser.add_argument("--fallback-model-root", required=True)
    parser.add_argument("--provider", default="offline_ct2_hybrid")
    parser.add_argument("--model-name", default="argos-zh-en-1.9+nllb-200-distilled-600m-int8")
    parser.add_argument("--glossary-version", type=int, required=True)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--block-size", type=int, default=2048)
    parser.add_argument("--max-chunk-chars", type=int, default=140)
    parser.add_argument("--inter-threads", type=int, default=2)
    parser.add_argument("--intra-threads", type=int, default=5)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--year")
    parser.add_argument("--record-id")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def split_text(value, max_chars):
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return [("", "")]
    pieces = []
    pending_joiner = ""
    for part in re.split(r"(\n+)", text):
        if not part:
            continue
        if part.startswith("\n"):
            pending_joiner = "\n" if len(part) == 1 else "\n\n"
            continue
        sentences = [match.group(0).strip() for match in SENTENCE_SPLIT_RE.finditer(part)]
        sentences = [sentence for sentence in sentences if sentence]
        for sentence_index, sentence in enumerate(sentences):
            chunks = hard_split(sentence, max_chars)
            for chunk_index, chunk in enumerate(chunks):
                joiner = pending_joiner if not pieces or (sentence_index == 0 and chunk_index == 0 and pending_joiner) else " "
                if not pieces:
                    joiner = ""
                pieces.append((joiner, chunk))
                pending_joiner = ""
    return pieces or [("", text)]


def normalize_translation_input(value):
    """Remove transcript-only entity wrappers before sending text to a model."""
    text = str(value or "")
    text = INLINE_ZH_TAG_RE.sub(lambda match: match.group(1), text)
    return PHONETIC_NOTE_RE.sub(r"\1phonetic\2", text)


def hard_split(text, max_chars):
    remaining = text.strip()
    chunks = []
    delimiters = ("，", ",", "、", "：", ":", " ")
    while len(remaining) > max_chars:
        boundaries = [remaining.rfind(delimiter, 0, max_chars + 1) for delimiter in delimiters]
        boundary = max(boundaries)
        if boundary < max_chars // 2:
            boundary = max_chars
        else:
            boundary += 1
        chunks.append(remaining[:boundary].strip())
        remaining = remaining[boundary:].strip()
    if remaining:
        chunks.append(remaining)
    return chunks


def build_glossary(raw_entries):
    source_map = {}
    for entry in raw_entries:
        preferred = str(entry.get("preferredEnglish") or "").strip()
        for source in entry.get("sourcePatterns") or []:
            source = str(source).strip()
            if not source or not preferred:
                continue
            existing = source_map.get(source)
            if existing and existing != preferred:
                raise ValueError(f"Conflicting glossary rule for {source}")
            source_map[source] = preferred
    entries = sorted(source_map.items(), key=lambda item: (-len(item[0]), item[0]))
    if not entries:
        raise ValueError("The controlled glossary is empty")
    pattern = re.compile("|".join(re.escape(source) for source, _ in entries))
    return {"pattern": pattern, "source_map": source_map}


def protect_terms(text, glossary):
    markers = []

    def replace(match):
        marker = f"ZXQ{marker_code(len(markers))}ZXQ"
        markers.append((marker, glossary["source_map"][match.group(0)]))
        return marker

    return glossary["pattern"].sub(replace, text), markers


def marker_code(index):
    parts = []
    number = int(index)
    while True:
        parts.append(MARKER_CODES[number % len(MARKER_CODES)])
        number //= len(MARKER_CODES)
        if number == 0:
            return "".join(reversed(parts))


def restore_terms(text, markers):
    restored = str(text or "")
    ok = True
    for marker, preferred in markers:
        code = marker[3:-3]
        token_pattern = r"Z+X+Q\s*" + r"\s*".join(code) + r"\s*Z*X*Q"
        pattern = re.compile(token_pattern, re.IGNORECASE)
        matches = list(pattern.finditer(restored))
        if len(matches) != 1:
            ok = False
        restored = pattern.sub(f" {preferred} ", restored)
    if MARKER_RE.search(restored):
        ok = False
    return normalize_english(restored), ok


def translation_quality_issue(source, translated, marker_ok, relaxed=False):
    text = normalize_english(translated)
    if not marker_ok:
        return "protected-term-loss"
    if not text:
        return "empty-output"
    if CJK_RE.search(text):
        return "cjk-residue"
    source_cjk = len(CJK_RE.findall(source))
    target_letters = len(re.findall(r"[A-Za-z]", text))
    if not relaxed and source_cjk >= 12 and target_letters < 3:
        return "implausibly-short"
    if len(text) > max(1000, len(source) * 24):
        return "implausibly-long"
    words = re.findall(r"[a-z0-9]+", text.lower())
    if len(words) >= 16:
        midpoint = len(words) // 2
        if words[:midpoint] == words[midpoint : midpoint * 2] and not source_supports_repetition(source):
            return "duplicated-output"
    return None


def source_supports_repetition(source):
    units = re.findall(r"[\u3400-\u9fff]|[a-z0-9]+", str(source or "").lower())
    if len(units) < 2:
        return False
    midpoint = len(units) // 2
    if len(units) % 2 == 0 and units[:midpoint] == units[midpoint:]:
        return True
    return Counter(units).most_common(1)[0][1] / len(units) >= 0.6


def normalize_english(value):
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"ZXQ[A-Z]+ZXQ", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\[\[zh:\s*([^\]]*?)\s*\]\]", r"\1", text, flags=re.IGNORECASE)
    text = re.sub(r"\[\[?zh\s*:\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r" +([,.;:!?])", r"\1", text)
    text = re.sub(r"\s+('s\b)", r"\1", text, flags=re.IGNORECASE)
    text = re.sub(r"\bfellow supporterss\b", "fellow supporters", text, flags=re.IGNORECASE)
    text = re.sub(r"\btake down the CCP\s+(?:the\s+)?(?:Chinese\s+)?Communist Party\b", "take down the CCP", text, flags=re.IGNORECASE)
    return text.strip()


def safe_record_id(record_id):
    return re.sub(r"[^a-z0-9._-]", "_", str(record_id), flags=re.IGNORECASE)[:180]


def cache_path(cache_root, record_id):
    year = str(record_id)[:4] if re.match(r"^\d{4}", str(record_id)) else "misc"
    return cache_root / year / f"{safe_record_id(record_id)}.json"


def failure_path(cache_root, record_id):
    return cache_root / "failures" / f"{safe_record_id(record_id)}.json"


def read_json(path):
    try:
        return json.loads(path.read_text("utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def write_json_atomic(path, value, mode=0o600):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.{os.getpid()}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", "utf-8")
    os.chmod(temporary, mode)
    os.replace(temporary, path)


def cache_matches(cached, metadata, args):
    return (
        not args.force
        and cached
        and cached.get("schemaVersion") == TRANSLATION_SCHEMA_VERSION
        and cached.get("language") == "en"
        and cached.get("status") in {"translated", "no_translation_needed"}
        and cached.get("sourceContentSha256") == metadata.get("contentSha256")
        and cached.get("glossaryVersion") == args.glossary_version
        and cached.get("provider") == args.provider
        and cached.get("model") == args.model_name
    )


def source_hash(record):
    if record.get("contentSha256"):
        return record["contentSha256"]
    joined = "\n".join(str(segment.get("text") or "") for segment in record.get("segments", []))
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def translation_payload(record, title, segment_texts, args):
    translated_segments = []
    for segment, text in zip(record.get("segments", []), segment_texts):
        translated_segments.append(
            {"start": segment.get("start"), "end": segment.get("end"), "text": text}
        )
    body = "\n".join(segment["text"] for segment in translated_segments)
    source_text = f"{record.get('title') or ''}\n" + "\n".join(
        str(segment.get("text") or "") for segment in record.get("segments", [])
    )
    status = "translated" if CJK_RE.search(source_text) else "no_translation_needed"
    return {
        "schemaVersion": TRANSLATION_SCHEMA_VERSION,
        "id": record.get("id"),
        "date": record.get("date"),
        "sourceLanguage": record.get("language"),
        "language": "en",
        "status": status,
        "title": title,
        "provider": args.provider,
        "model": args.model_name,
        "glossaryVersion": args.glossary_version,
        "translatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sourceContentSha256": source_hash(record),
        "contentSha256": hashlib.sha256(f"{title}\n{body}".encode("utf-8")).hexdigest(),
        "segmentCount": len(translated_segments),
        "charCount": len(body),
        "segments": translated_segments,
    }


def main():
    args = parse_args()
    source_root = Path(args.source_root).resolve()
    cache_root = Path(args.cache_root).resolve()
    progress_path = Path(args.progress_path).resolve()
    manifest = json.loads((source_root / "manifest.json").read_text("utf-8"))
    raw_glossary = json.loads(Path(args.glossary_json).read_text("utf-8"))
    glossary = build_glossary(raw_glossary)

    metadata = [
        record
        for record in manifest.get("records", [])
        if record.get("transcriptStatus") != "empty" and int(record.get("segmentCount") or 0) > 0
    ]
    if args.year:
        years = {year.strip() for year in args.year.split(",") if year.strip()}
        metadata = [record for record in metadata if str(record.get("date") or "")[:4] in years]
    if args.record_id:
        record_ids = {record_id.strip() for record_id in args.record_id.split(",") if record_id.strip()}
        metadata = [record for record in metadata if record.get("id") in record_ids]
    if args.limit is not None:
        metadata = metadata[: max(0, args.limit)]

    metadata_by_id = {record["id"]: record for record in metadata}
    selected_ids = set(metadata_by_id)
    total_records = len(metadata)
    total_characters = sum(int(record.get("charCount") or 0) for record in metadata)
    completed_ids = set()
    completed_characters = 0
    for record in metadata:
        cached = read_json(cache_path(cache_root, record["id"]))
        if cache_matches(cached, record, args):
            completed_ids.add(record["id"])
            completed_characters += int(record.get("charCount") or 0)

    started_at = time.time()
    initial_completed_characters = completed_characters
    failures = 0
    translated_this_pass = 0
    skipped_this_pass = len(completed_ids)
    current_record_id = None
    current_record_chunks = 0
    current_record_total_chunks = 0
    last_error = None
    stop_requested = False

    def handle_stop(_signum, _frame):
        nonlocal stop_requested
        stop_requested = True

    signal.signal(signal.SIGTERM, handle_stop)
    signal.signal(signal.SIGINT, handle_stop)

    translator = HybridTranslator(args, glossary)

    def write_progress(status):
        elapsed = max(0.001, time.time() - started_at)
        new_characters = max(0, completed_characters - initial_completed_characters)
        chars_per_hour = round(new_characters / elapsed * 3600) if new_characters else None
        remaining = max(0, total_characters - completed_characters)
        eta = round(remaining / chars_per_hour * 3600) if chars_per_hour else None
        write_json_atomic(
            progress_path,
            {
                "schemaVersion": 3,
                "status": status,
                "provider": args.provider,
                "model": args.model_name,
                "glossaryVersion": args.glossary_version,
                "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(started_at)),
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "totalRecords": total_records,
                "completedRecords": len(completed_ids),
                "remainingRecords": max(0, total_records - len(completed_ids)),
                "failedRecordsThisPass": failures,
                "translatedThisPass": translated_this_pass,
                "skippedThisPass": skipped_this_pass,
                "totalSourceCharacters": total_characters,
                "completedSourceCharacters": completed_characters,
                "remainingSourceCharacters": remaining,
                "progressPercent": round(completed_characters / total_characters * 100, 4) if total_characters else 100,
                "sourceCharactersPerHour": chars_per_hour,
                "estimatedRemainingSeconds": eta,
                "currentRecordId": current_record_id,
                "currentBatch": current_record_chunks,
                "currentBatchCount": current_record_total_chunks,
                "currentBatchState": "translating" if current_record_id else None,
                "primaryChunks": translator.primary_chunks,
                "fallbackChunks": translator.fallback_chunks,
                "glossarySplicedChunks": translator.spliced_chunks,
                "constrainedChunks": translator.constrained_chunks,
                "staticChunks": translator.static_chunks,
                "fallbackReasons": translator.fallback_reasons,
                "lastError": last_error,
            },
        )

    write_progress("running")

    for shard in manifest.get("shards", []):
        if stop_requested:
            break
        shard_ids = {
            record_id
            for record_id in selected_ids
            if metadata_by_id[record_id].get("dataShard") == shard.get("dataFilename")
        }
        if not shard_ids:
            continue
        shard_path = source_root / shard["dataFilename"]
        records = json.loads(gzip.decompress(shard_path.read_bytes()).decode("utf-8"))
        for record in records:
            record_id = record.get("id")
            if stop_requested:
                break
            if record_id not in shard_ids or record_id in completed_ids:
                continue
            current_record_id = record_id
            current_record_chunks = 0
            current_record_total_chunks = 0
            write_progress("running")

            def record_progress(done, total, _primary, _fallback, _spliced):
                nonlocal current_record_chunks, current_record_total_chunks
                current_record_chunks = done
                current_record_total_chunks = total
                write_progress("running")
                if stop_requested:
                    raise KeyboardInterrupt()

            try:
                title, segment_texts = translator.translate_record(record, record_progress)
                payload = translation_payload(record, title, segment_texts, args)
                write_json_atomic(cache_path(cache_root, record_id), payload)
                failure_path(cache_root, record_id).unlink(missing_ok=True)
                completed_ids.add(record_id)
                completed_characters += int(metadata_by_id[record_id].get("charCount") or 0)
                translated_this_pass += 1
                if translated_this_pass % 25 == 0:
                    print(
                        json.dumps(
                            {
                                "translated": translated_this_pass,
                                "completed": len(completed_ids),
                                "total": total_records,
                                "progressPercent": round(completed_characters / total_characters * 100, 3),
                                "latest": record_id,
                                "fallbackChunks": translator.fallback_chunks,
                            },
                            ensure_ascii=False,
                        ),
                        flush=True,
                    )
            except KeyboardInterrupt:
                stop_requested = True
                break
            except Exception as error:
                failures += 1
                last_error = f"{record_id}: {error}"
                write_json_atomic(
                    failure_path(cache_root, record_id),
                    {
                        "id": record_id,
                        "sourceContentSha256": source_hash(record),
                        "failedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "message": str(error),
                    },
                )
                print(json.dumps({"failed": record_id, "error": str(error)}), file=sys.stderr, flush=True)
            finally:
                write_progress("running")

    current_record_id = None
    current_record_chunks = 0
    current_record_total_chunks = 0
    if stop_requested:
        final_status = "paused"
    elif failures:
        final_status = "pass_complete_with_failures"
    else:
        final_status = "pass_complete"
    write_progress(final_status)
    print(
        json.dumps(
            {
                "status": final_status,
                "completedRecords": len(completed_ids),
                "totalRecords": total_records,
                "failedRecords": failures,
                "primaryChunks": translator.primary_chunks,
                "fallbackChunks": translator.fallback_chunks,
                "glossarySplicedChunks": translator.spliced_chunks,
                "constrainedChunks": translator.constrained_chunks,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    return 0 if final_status == "pass_complete" else 2


if __name__ == "__main__":
    raise SystemExit(main())
