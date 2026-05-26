import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/features/auth/providers/auth_provider.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';
import 'package:ecodefill_mobile/core/widgets/dynamic_island_notification.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _sectionController = TextEditingController();
  final _codeController = TextEditingController();
  
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  final List<TextEditingController> _boxControllers = List.generate(6, (_) => TextEditingController());

  String? _selectedCourse;
  String? _selectedYearLevel;
  String? _selectedSection;
  int _countdown = 0;
  Timer? _timer;

  final List<String> _sections = ['A', 'B', 'C', 'D'];

  final List<String> _courses = [
    'BSIT',
    'BSCS',
    'BSHM',
    'BSTM',
    'BECED',
    'BTLED',
    'BSOAD'
  ];

  final List<String> _yearLevels = [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year'
  ];

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _fullNameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _sectionController.dispose();
    _codeController.dispose();
    for (var node in _focusNodes) {
      node.dispose();
    }
    for (var controller in _boxControllers) {
      controller.dispose();
    }
    _timer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    setState(() {
      _countdown = 60;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown > 0) {
        setState(() {
          _countdown--;
        });
      } else {
        _timer?.cancel();
      }
    });
  }

  void _requestOTP() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      DynamicIslandNotification.show(
        context,
        title: 'Registration',
        subtitle: 'Please enter your email address first.',
        icon: Icons.warning_amber_rounded,
        type: NotificationType.warning,
      );
      return;
    }
    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      DynamicIslandNotification.show(
        context,
        title: 'Registration',
        subtitle: 'Please enter a valid email address.',
        icon: Icons.warning_amber_rounded,
        type: NotificationType.warning,
      );
      return;
    }

    final success = await ref.read(authProvider.notifier).requestVerificationCode(email, 'register');
    if (success && mounted) {
      DynamicIslandNotification.show(
        context,
        title: 'OTP Verification',
        subtitle: 'Verification code sent to your email!',
        icon: Icons.mark_email_read_rounded,
        type: NotificationType.success,
      );
      _startCountdown();
    }
  }

  void _submit() async {
    _codeController.text = _boxControllers.map((c) => c.text).join();
    if (_formKey.currentState!.validate()) {
      if (_codeController.text.trim().length != 6) {
        DynamicIslandNotification.show(
          context,
          title: 'Verification Code',
          subtitle: 'Please enter the complete 6-digit code.',
          icon: Icons.error_outline_rounded,
          type: NotificationType.error,
        );
        return;
      }
      if (_passwordController.text != _confirmPasswordController.text) {
        DynamicIslandNotification.show(
          context,
          title: 'Password Mismatch',
          subtitle: 'Passwords do not match.',
          icon: Icons.lock_reset_rounded,
          type: NotificationType.error,
        );
        return;
      }

      final success = await ref.read(authProvider.notifier).register(
            email: _emailController.text.trim(),
            password: _passwordController.text,
            verificationCode: _codeController.text.trim(),
            fullName: _fullNameController.text.trim(),
            course: _selectedCourse,
            yearLevel: _selectedYearLevel,
            section: _selectedSection ?? '',
          );
      
      if (success && mounted) {
        DynamicIslandNotification.show(
          context,
          title: 'Registration Complete',
          subtitle: 'Account created! You can now log in.',
          icon: Icons.check_circle_rounded,
          type: NotificationType.success,
        );
        // Clear auth error if any, and navigate back to login
        ref.read(authProvider.notifier).clearError();
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.textDark),
          onPressed: () {
            ref.read(authProvider.notifier).clearError();
            Navigator.pop(context);
          },
        ),
        title: const Text('Complete Registration', style: TextStyle(color: AppTheme.textDark, fontWeight: FontWeight.bold)),
      ),
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          // Background Gradient Orbs
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryEmerald.withOpacity(0.08),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.accentBlue.withOpacity(0.08),
              ),
            ),
          ),
          
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Subtitle
                      Text(
                        'Set up your student profile details below.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppTheme.textMuted,
                            ),
                      ),
                      const SizedBox(height: 24),

                      // Error Alert Banner
                      if (authState.error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.red.shade100),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.error_outline, color: Colors.red.shade600),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  authState.error!,
                                  style: TextStyle(
                                    color: Colors.red.shade700,
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Email Field with Send Code button
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: InputDecoration(
                                labelText: 'Email Address',
                                prefixIcon: const Icon(Icons.email_outlined),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                filled: true,
                                fillColor: Colors.white,
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please enter your email';
                                }
                                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                                  return 'Please enter a valid email address';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(
                            height: 56,
                            child: ElevatedButton(
                              onPressed: (_countdown > 0 || authState.isLoading)
                                  ? null
                                  : _requestOTP,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.accentBlue,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              child: Text(
                                _countdown > 0 ? '${_countdown}s' : 'Send Code',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Verification Code Label & 6 OTP Boxes
                      const Padding(
                        padding: EdgeInsets.only(left: 4.0),
                        child: Text(
                          'Verification Code',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textDark,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      _buildOtpBoxes(),
                      const SizedBox(height: 16),

                      // Full Name Field
                      TextFormField(
                        controller: _fullNameController,
                        textCapitalization: TextCapitalization.words,
                        decoration: InputDecoration(
                          labelText: 'Full Name',
                          prefixIcon: const Icon(Icons.person_outline_rounded),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please enter your full name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Password Field
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outlined),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter your password';
                          }
                          if (value.length < 8) {
                            return 'Password must be at least 8 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Confirm Password Field
                      TextFormField(
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirmPassword,
                        decoration: InputDecoration(
                          labelText: 'Confirm Password',
                          prefixIcon: const Icon(Icons.lock_outlined),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscureConfirmPassword = !_obscureConfirmPassword;
                              });
                            },
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please confirm your password';
                          }
                          if (value != _passwordController.text) {
                            return 'Passwords do not match';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Course, Year, and Section Row
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Course Dropdown
                          Expanded(
                            flex: 1,
                            child: DropdownButtonFormField<String>(
                              value: _selectedCourse,
                              decoration: InputDecoration(
                                labelText: 'Course',
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                filled: true,
                                fillColor: Colors.white,
                              ),
                              items: _courses.map((course) {
                                return DropdownMenuItem<String>(
                                  value: course,
                                  child: Text(course, style: const TextStyle(fontSize: 12)),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setState(() {
                                  _selectedCourse = value;
                                });
                              },
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Req.';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Year Level Dropdown
                          Expanded(
                            flex: 1,
                            child: DropdownButtonFormField<String>(
                              value: _selectedYearLevel,
                              decoration: InputDecoration(
                                labelText: 'Year',
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                filled: true,
                                fillColor: Colors.white,
                              ),
                              items: _yearLevels.map((level) {
                                final shortVal = level.split(' ')[0];
                                return DropdownMenuItem<String>(
                                  value: level,
                                  child: Text(shortVal, style: const TextStyle(fontSize: 12)),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setState(() {
                                  _selectedYearLevel = value;
                                });
                              },
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Req.';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Section Dropdown Field
                          Expanded(
                            flex: 1,
                            child: DropdownButtonFormField<String>(
                              value: _selectedSection,
                              decoration: InputDecoration(
                                labelText: 'Section',
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                filled: true,
                                fillColor: Colors.white,
                              ),
                              items: _sections.map((sec) {
                                return DropdownMenuItem<String>(
                                  value: sec,
                                  child: Text(sec, style: const TextStyle(fontSize: 12)),
                                );
                              }).toList(),
                              onChanged: (value) {
                                setState(() {
                                  _selectedSection = value;
                                });
                              },
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Req.';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),

                      // Register Button
                      ElevatedButton(
                        onPressed: authState.isLoading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryEmerald,
                        ),
                        child: authState.isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text('Register Account'),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOtpBoxes() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(6, (index) {
        return SizedBox(
          width: 44,
          height: 52,
          child: TextFormField(
            controller: _boxControllers[index],
            focusNode: _focusNodes[index],
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.textDark,
            ),
            maxLength: 1,
            decoration: InputDecoration(
              counterText: "",
              contentPadding: EdgeInsets.zero,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.primaryEmerald, width: 2),
              ),
              filled: true,
              fillColor: Colors.white,
            ),
            onChanged: (value) {
              if (value.length == 1) {
                if (index < 5) {
                  _focusNodes[index + 1].requestFocus();
                } else {
                  _focusNodes[index].unfocus();
                }
              } else if (value.isEmpty) {
                if (index > 0) {
                  _focusNodes[index - 1].requestFocus();
                }
              }
              // Sync to main code controller
              _codeController.text = _boxControllers.map((c) => c.text).join();
            },
          ),
        );
      }),
    );
  }
}
