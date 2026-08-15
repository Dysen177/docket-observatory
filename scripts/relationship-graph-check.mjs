import assert from 'node:assert/strict'
import { relationshipGraphForRecords } from '../server/document-analysis.js'

const linkedCase = { id: 'linked-case', shortTitle: 'Linked case', docket: '1:26-cv-00001' }
const withdrawalCase = { id: 'dconn-26-mc-00002', shortTitle: 'Withdrawal proceeding', docket: '3:26-mc-00002' }
const pendingCase = { id: 'pending-case', shortTitle: 'Pending verification', docket: '1:26-cv-00003' }
const state = {
  cases: [linkedCase, withdrawalCase, pendingCase],
  entities: [
    { id: 'linked-person', name: 'Linked person', type: 'Person', role: 'defendant', riskAreas: [], caseIds: ['linked-case'] },
    { id: 'unlinked-company', name: 'Unlinked company', type: 'Company', role: '', riskAreas: [], caseIds: [] },
  ],
}

const graph = relationshipGraphForRecords([{ caseId: 'linked-case' }], state, 'en')
assert.deepEqual(graph.nodes.map((node) => node.id).sort(), ['linked-case', 'linked-person'])
assert.deepEqual(graph.links, [{ source: 'linked-person', target: 'linked-case', label: 'defendant / co-defendant' }])
assert.equal(graph.nodes.every((node) => graph.links.some((link) => link.source === node.id || link.target === node.id)), true)

console.log(JSON.stringify({
  status: 'ok',
  nodes: graph.nodes.length,
  links: graph.links.length,
  excludedZeroLinkCases: 2,
  excludedZeroLinkEntities: 1,
}, null, 2))
