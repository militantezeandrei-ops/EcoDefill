import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';

enum NotificationType { success, warning, error, info }

class DynamicIslandNotification {
  final String title;
  final String subtitle;
  final IconData icon;
  final NotificationType type;
  final VoidCallback? onTap;

  DynamicIslandNotification({
    required this.title,
    required this.subtitle,
    required this.icon,
    this.type = NotificationType.info,
    this.onTap,
  });

  /// Triggers a global notification overlay
  static void show(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    NotificationType type = NotificationType.info,
    VoidCallback? onTap,
  }) {
    final notification = DynamicIslandNotification(
      title: title,
      subtitle: subtitle,
      icon: icon,
      type: type,
      onTap: onTap,
    );
    DynamicIslandManager().show(context, notification);
  }
}

class DynamicIslandManager {
  static final DynamicIslandManager _instance = DynamicIslandManager._internal();
  factory DynamicIslandManager() => _instance;
  DynamicIslandManager._internal();

  final List<DynamicIslandNotification> _queue = [];
  bool _isShowing = false;
  OverlayEntry? _currentEntry;

  void show(BuildContext context, DynamicIslandNotification notification) {
    _queue.add(notification);
    _processQueue(context);
  }

  void _processQueue(BuildContext context) {
    if (_isShowing || _queue.isEmpty) return;
    _isShowing = true;
    final next = _queue.removeAt(0);

    // Create and insert overlay entry
    _currentEntry = OverlayEntry(
      builder: (context) => DynamicIslandOverlayWidget(
        notification: next,
        onDismiss: () {
          _isShowing = false;
          _currentEntry?.remove();
          _currentEntry = null;
          // Process next notification in queue
          _processQueue(context);
        },
      ),
    );

    // Insert into global overlay state
    final overlayState = Overlay.of(context);
    overlayState.insert(_currentEntry!);
  }
}

class DynamicIslandOverlayWidget extends StatefulWidget {
  final DynamicIslandNotification notification;
  final VoidCallback onDismiss;

  const DynamicIslandOverlayWidget({
    super.key,
    required this.notification,
    required this.onDismiss,
  });

  @override
  State<DynamicIslandOverlayWidget> createState() => _DynamicIslandOverlayWidgetState();
}

class _DynamicIslandOverlayWidgetState extends State<DynamicIslandOverlayWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _progress;
  late Animation<double> _contentFade;
  Timer? _dismissTimer;
  bool _isTapped = false;
  double _dragOffset = 0.0;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
      reverseDuration: const Duration(milliseconds: 400),
    );

    // Spring/elastic effect for morphing entry
    _progress = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
      reverseCurve: Curves.easeInBack,
    );

    // Content inside should fade in after the expansion is almost done
    _contentFade = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.5, 1.0, curve: Curves.easeOut),
    );

    // Play entrance and haptic feedback
    _controller.forward();
    HapticFeedback.mediumImpact();

    // Auto dismiss after 3 seconds
    _dismissTimer = Timer(const Duration(milliseconds: 3200), () {
      _dismissWithAnimation();
    });
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  bool _isDismissing = false;

  void _dismissWithAnimation() {
    if (_isDismissing || !mounted) return;
    _isDismissing = true;
    _controller.reverse().then((_) {
      if (mounted) {
        widget.onDismiss();
      }
    });
  }

  Color _getTypeColor() {
    switch (widget.notification.type) {
      case NotificationType.success:
        return AppTheme.primaryEmerald;
      case NotificationType.warning:
        return Colors.amber.shade500;
      case NotificationType.error:
        return Colors.red.shade500;
      case NotificationType.info:
        return AppTheme.accentBlue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final neonColor = _getTypeColor();

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: GestureDetector(
          onVerticalDragUpdate: (details) {
            setState(() {
              _dragOffset += details.primaryDelta!;
              if (_dragOffset > 0) _dragOffset = 0; // Don't drag downwards past limit
            });
          },
          onVerticalDragEnd: (details) {
            if (_dragOffset < -15.0) {
              // Dismiss if swiped up sufficiently
              _dismissTimer?.cancel();
              _dismissWithAnimation();
            } else {
              // Bounce back
              setState(() {
                _dragOffset = 0.0;
              });
            }
          },
          onTapDown: (_) {
            setState(() {
              _isTapped = true;
            });
            HapticFeedback.lightImpact();
          },
          onTapUp: (_) {
            setState(() {
              _isTapped = false;
            });
            if (widget.notification.onTap != null) {
              widget.notification.onTap!();
            }
            _dismissTimer?.cancel();
            _dismissWithAnimation();
          },
          onTapCancel: () {
            setState(() {
              _isTapped = false;
            });
          },
          child: AnimatedBuilder(
            animation: _progress,
            builder: (context, child) {
              // Morph math configurations
              final double height = lerpDouble(32.0, 72.0, _progress.value)!;
              final double width = lerpDouble(120.0, screenWidth - 32.0, _progress.value)!;
              final double topOffset = lerpDouble(8.0, 16.0, _progress.value)! + _dragOffset;
              final double borderRadius = lerpDouble(24.0, 20.0, _progress.value)!;
              final double opacity = _progress.value.clamp(0.0, 1.0);
              final double scale = _isTapped ? 0.96 : 1.0;

              return Transform.translate(
                offset: Offset(0, topOffset),
                child: Transform.scale(
                  scale: scale,
                  alignment: Alignment.topCenter,
                  child: Center(
                    child: Opacity(
                      opacity: opacity,
                      child: Container(
                        height: height,
                        width: width,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(borderRadius),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(borderRadius),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                            child: Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A).withOpacity(0.85), // Dark space glassmorphism
                                borderRadius: BorderRadius.circular(borderRadius),
                                border: Border.all(
                                  color: neonColor.withOpacity(lerpDouble(0.1, 0.45, _progress.value)!.clamp(0.0, 1.0)),
                                  width: 1.5,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: neonColor.withOpacity(lerpDouble(0.0, 0.18, _progress.value)!.clamp(0.0, 1.0)),
                                    blurRadius: 16,
                                    spreadRadius: -2,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 16.0),
                              child: _progress.value > 0.65
                                  ? FadeTransition(
                                      opacity: _contentFade,
                                      child: Row(
                                        children: [
                                          // Status Icon Glow Ring
                                          Container(
                                            width: 38,
                                            height: 38,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: neonColor.withOpacity(0.15),
                                              border: Border.all(
                                                color: neonColor.withOpacity(0.4),
                                                width: 1,
                                              ),
                                            ),
                                            child: Icon(
                                              widget.notification.icon,
                                              color: neonColor,
                                              size: 18,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          // Texts
                                          Expanded(
                                            child: Column(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  widget.notification.title,
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.bold,
                                                    decoration: TextDecoration.none,
                                                    fontFamily: 'Outfit',
                                                  ),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  widget.notification.subtitle,
                                                  style: const TextStyle(
                                                    color: Color(0xFF94A3B8), // slate-400
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w500,
                                                    decoration: TextDecoration.none,
                                                    fontFamily: 'Outfit',
                                                  ),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                  : const SizedBox.shrink(),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
