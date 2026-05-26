import 'package:flutter/material.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';

class GuideSlidesDialog extends StatefulWidget {
  final VoidCallback onFinish;

  const GuideSlidesDialog({
    super.key,
    required this.onFinish,
  });

  static void show(BuildContext context, {required VoidCallback onFinish}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withOpacity(0.6),
      builder: (context) => GuideSlidesDialog(onFinish: onFinish),
    );
  }

  @override
  State<GuideSlidesDialog> createState() => _GuideSlidesDialogState();
}

class _GuideSlidesDialogState extends State<GuideSlidesDialog> {
  int _currentSlide = 0;

  final List<Map<String, dynamic>> _slides = [
    {
      'title': 'Welcome to EcoDefill!',
      'description': 'Your journey to a greener campus starts here. Let\'s show you how to use the system.',
      'icon': Icons.auto_awesome_rounded,
      'color': Colors.blue.shade600,
      'bg': Colors.blue.shade50,
    },
    {
      'title': 'Step 1: Earn Points',
      'description': 'Go to any EcoDefill Machine. Drop your plastic bottles, cups, or module papers into the slot to receive points.',
      'icon': Icons.recycling_rounded,
      'color': AppTheme.primaryEmerald,
      'bg': const Color(0xFFE8F5E9),
    },
    {
      'title': 'Step 2: Redeem Water',
      'description': 'Use your points to get clean water from our dispensers. 1 point is typically equal to 100ml of water.',
      'icon': Icons.water_drop_rounded,
      'color': Colors.blue.shade500,
      'bg': Colors.blue.shade50,
    },
    {
      'title': 'Rise in the Ranking',
      'description': 'Represent your course! Every item you recycle adds to your Academic Ranking. Let\'s make your course #1!',
      'icon': Icons.emoji_events_rounded,
      'color': Colors.amber.shade600,
      'bg': Colors.amber.shade50,
    },
  ];

  void _next() {
    if (_currentSlide < _slides.length - 1) {
      setState(() {
        _currentSlide++;
      });
    } else {
      widget.onFinish();
      Navigator.of(context).pop();
    }
  }

  void _prev() {
    if (_currentSlide > 0) {
      setState(() {
        _currentSlide--;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final slide = _slides[_currentSlide];
    final IconData slideIcon = slide['icon'] as IconData;
    final Color iconColor = slide['color'] as Color;
    final Color bgColor = slide['bg'] as Color;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(32),
      ),
      elevation: 24,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: Container(
          color: Colors.white,
          width: double.infinity,
          constraints: const BoxConstraints(maxHeight: 460),
          child: Stack(
            children: [
              // Progress Bar at the top
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Padding(
                  padding: const EdgeInsets.only(top: 24.0, left: 24.0, right: 24.0),
                  child: Row(
                    children: List.generate(_slides.length, (index) {
                      final isActive = index <= _currentSlide;
                      return Expanded(
                        child: Container(
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 2.0),
                          decoration: BoxDecoration(
                            color: isActive ? Colors.blue.shade600 : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              ),

              // Close Button (top right)
              Positioned(
                top: 36,
                right: 12,
                child: IconButton(
                  onPressed: () {
                    widget.onFinish();
                    Navigator.of(context).pop();
                  },
                  icon: const Icon(Icons.close, color: Colors.grey),
                  splashRadius: 20,
                ),
              ),

              // Content Area
              Padding(
                padding: const EdgeInsets.only(top: 80.0, left: 24.0, right: 24.0, bottom: 24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Icon Container
                    Container(
                      height: 96,
                      width: 96,
                      decoration: BoxDecoration(
                        color: bgColor,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Icon(
                        slideIcon,
                        size: 48,
                        color: iconColor,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Title
                    Text(
                      slide['title'] as String,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.textDark,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Description
                    SizedBox(
                      height: 80,
                      child: Text(
                        slide['description'] as String,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.textMuted,
                          height: 1.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Navigation Buttons
                    Row(
                      children: [
                        // Back Button
                        if (_currentSlide > 0)
                          IconButton(
                            onPressed: _prev,
                            icon: const Icon(Icons.arrow_back, color: AppTheme.textMuted),
                            style: IconButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: BorderSide(color: Colors.grey.shade200),
                              ),
                              padding: const EdgeInsets.all(12),
                            ),
                          )
                        else
                          const SizedBox(width: 48), // Spacer to maintain alignment

                        const SizedBox(width: 12),

                        // Next/Finish Button
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _next,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue.shade600,
                              foregroundColor: Colors.white,
                              elevation: 4,
                              shadowColor: Colors.blue.shade600.withOpacity(0.3),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  _currentSlide == _slides.length - 1 ? 'Get Started' : 'Next Step',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 15,
                                  ),
                                ),
                                if (_currentSlide < _slides.length - 1) ...[
                                  const SizedBox(width: 8),
                                  const Icon(Icons.arrow_forward, size: 16),
                                ]
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
