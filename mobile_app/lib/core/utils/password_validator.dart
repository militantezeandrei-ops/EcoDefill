import 'dart:convert';

const String passwordPolicyHint =
    'Min 8 chars, 1 uppercase, 1 number (no sequences like 123/321), and 1 symbol.';

bool hasSequentialDigits(String password) {
  for (int i = 0; i <= password.length - 3; i++) {
    final c0 = password.codeUnitAt(i);
    final c1 = password.codeUnitAt(i + 1);
    final c2 = password.codeUnitAt(i + 2);
    final isDigits =
        c0 >= 48 && c0 <= 57 &&
        c1 >= 48 && c1 <= 57 &&
        c2 >= 48 && c2 <= 57;
    if (!isDigits) continue;
    if ((c1 - c0 == 1 && c2 - c1 == 1) || (c1 - c0 == -1 && c2 - c1 == -1)) {
      return true;
    }
  }
  return false;
}

String? validateStrongPassword(String? value) {
  if (value == null || value.isEmpty) {
    return 'Please enter a password';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (utf8.encode(value).length > 72) {
    return 'Password must be at most 72 bytes';
  }
  if (!RegExp(r'[A-Z]').hasMatch(value)) {
    return 'Include at least 1 uppercase letter';
  }
  if (!RegExp(r'[0-9]').hasMatch(value)) {
    return 'Include at least 1 number';
  }
  if (!RegExp(r'[^A-Za-z0-9]').hasMatch(value)) {
    return 'Include at least 1 symbol (e.g. !@#\$%)';
  }
  if (hasSequentialDigits(value)) {
    return 'No sequential numbers (e.g. 123, 321)';
  }
  return null;
}
