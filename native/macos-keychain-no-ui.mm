#include <CoreFoundation/CoreFoundation.h>
#import <LocalAuthentication/LocalAuthentication.h>
#include <Security/Security.h>
#include <node_api.h>

#include <array>
#include <string>
#include <vector>

namespace {

constexpr size_t kVaultKeyBytes = 32;

void ThrowStatus(napi_env env, const char* operation, OSStatus status) {
  std::string message = std::string(operation) + " failed with OSStatus " + std::to_string(status) + ".";
  napi_throw_error(env, "MACOS_KEYCHAIN_NO_UI", message.c_str());
}

bool ReadString(napi_env env, napi_value value, std::string* output) {
  size_t length = 0;
  if (napi_get_value_string_utf8(env, value, nullptr, 0, &length) != napi_ok || length == 0 || length > 255) {
    napi_throw_type_error(env, nullptr, "Keychain service and account must be non-empty strings of at most 255 bytes.");
    return false;
  }
  std::vector<char> buffer(length + 1);
  if (napi_get_value_string_utf8(env, value, buffer.data(), buffer.size(), &length) != napi_ok) {
    napi_throw_type_error(env, nullptr, "Unable to read keychain string argument.");
    return false;
  }
  output->assign(buffer.data(), length);
  return true;
}

CFStringRef MakeString(const std::string& value) {
  return CFStringCreateWithBytes(
      kCFAllocatorDefault,
      reinterpret_cast<const UInt8*>(value.data()),
      value.size(),
      kCFStringEncodingUTF8,
      false);
}

CFMutableDictionaryRef MakeBaseQuery(CFStringRef service, CFStringRef account) {
  CFMutableDictionaryRef query = CFDictionaryCreateMutable(
      kCFAllocatorDefault,
      0,
      &kCFTypeDictionaryKeyCallBacks,
      &kCFTypeDictionaryValueCallBacks);
  CFDictionarySetValue(query, kSecClass, kSecClassGenericPassword);
  CFDictionarySetValue(query, kSecAttrService, service);
  CFDictionarySetValue(query, kSecAttrAccount, account);
  LAContext* context = [[LAContext alloc] init];
  context.interactionNotAllowed = YES;
  CFDictionarySetValue(query, kSecUseAuthenticationContext, (__bridge CFTypeRef)context);
  return query;
}

OSStatus CopyExistingKey(CFStringRef service, CFStringRef account, CFDataRef* result) {
  CFMutableDictionaryRef query = MakeBaseQuery(service, account);
  CFDictionarySetValue(query, kSecReturnData, kCFBooleanTrue);
  CFDictionarySetValue(query, kSecMatchLimit, kSecMatchLimitOne);
  CFTypeRef item = nullptr;
  const OSStatus status = SecItemCopyMatching(query, &item);
  CFRelease(query);
  if (status == errSecSuccess) *result = static_cast<CFDataRef>(item);
  return status;
}

OSStatus AddKey(CFStringRef service, CFStringRef account, CFDataRef key) {
  CFMutableDictionaryRef query = MakeBaseQuery(service, account);
  CFDictionarySetValue(query, kSecValueData, key);
  CFDictionarySetValue(query, kSecAttrLabel, CFSTR("Docket Observatory encrypted credential vault key"));
  const OSStatus status = SecItemAdd(query, nullptr);
  CFRelease(query);
  return status;
}

napi_value GetOrCreateKey(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc != 2) {
    napi_throw_type_error(env, nullptr, "getOrCreateKey requires service and account arguments.");
    return nullptr;
  }

  std::string service_value;
  std::string account_value;
  if (!ReadString(env, argv[0], &service_value) || !ReadString(env, argv[1], &account_value)) return nullptr;

  CFStringRef service = MakeString(service_value);
  CFStringRef account = MakeString(account_value);
  if (!service || !account) {
    if (service) CFRelease(service);
    if (account) CFRelease(account);
    napi_throw_error(env, nullptr, "Unable to create keychain identifiers.");
    return nullptr;
  }

  CFDataRef key_data = nullptr;
  OSStatus status = CopyExistingKey(service, account, &key_data);
  if (status == errSecItemNotFound) {
    std::array<uint8_t, kVaultKeyBytes> key{};
    status = SecRandomCopyBytes(kSecRandomDefault, key.size(), key.data());
    if (status == errSecSuccess) {
      CFDataRef generated = CFDataCreate(kCFAllocatorDefault, key.data(), key.size());
      status = AddKey(service, account, generated);
      CFRelease(generated);
      if (status == errSecDuplicateItem) status = CopyExistingKey(service, account, &key_data);
      else if (status == errSecSuccess) status = CopyExistingKey(service, account, &key_data);
    }
  }

  CFRelease(service);
  CFRelease(account);

  if (status != errSecSuccess || !key_data) {
    if (key_data) CFRelease(key_data);
    ThrowStatus(env, "Non-interactive keychain access", status);
    return nullptr;
  }

  const CFIndex length = CFDataGetLength(key_data);
  if (length != static_cast<CFIndex>(kVaultKeyBytes)) {
    CFRelease(key_data);
    napi_throw_error(env, "MACOS_KEYCHAIN_INVALID_KEY", "The keychain vault key has an invalid length.");
    return nullptr;
  }

  napi_value result;
  void* copied = nullptr;
  napi_create_buffer_copy(
      env,
      static_cast<size_t>(length),
      CFDataGetBytePtr(key_data),
      &copied,
      &result);
  CFRelease(key_data);
  return result;
}

napi_value DeleteKey(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc != 2) {
    napi_throw_type_error(env, nullptr, "deleteKey requires service and account arguments.");
    return nullptr;
  }

  std::string service_value;
  std::string account_value;
  if (!ReadString(env, argv[0], &service_value) || !ReadString(env, argv[1], &account_value)) return nullptr;
  CFStringRef service = MakeString(service_value);
  CFStringRef account = MakeString(account_value);
  CFMutableDictionaryRef query = MakeBaseQuery(service, account);
  const OSStatus status = SecItemDelete(query);
  CFRelease(query);
  CFRelease(service);
  CFRelease(account);

  if (status != errSecSuccess && status != errSecItemNotFound) {
    ThrowStatus(env, "Non-interactive keychain deletion", status);
    return nullptr;
  }
  napi_value result;
  napi_get_boolean(env, status == errSecSuccess, &result);
  return result;
}

napi_value Initialize(napi_env env, napi_value exports) {
  napi_value get_or_create;
  napi_value delete_key;
  napi_create_function(env, "getOrCreateKey", NAPI_AUTO_LENGTH, GetOrCreateKey, nullptr, &get_or_create);
  napi_create_function(env, "deleteKey", NAPI_AUTO_LENGTH, DeleteKey, nullptr, &delete_key);
  napi_set_named_property(env, exports, "getOrCreateKey", get_or_create);
  napi_set_named_property(env, exports, "deleteKey", delete_key);
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Initialize)
