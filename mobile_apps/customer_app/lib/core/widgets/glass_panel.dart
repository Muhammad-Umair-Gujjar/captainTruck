import 'package:flutter/material.dart';
import 'package:liquid_glass_renderer/liquid_glass_renderer.dart';

/// Shared liquid-glass card used across customer screens.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.borderRadius = 28,
    this.width,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return LiquidGlassLayer(
      settings: LiquidGlassSettings(
        thickness: 18,
        blur: 8,
        glassColor: Colors.white.withValues(alpha: 0.18),
        lightIntensity: 0.7,
      ),
      child: LiquidGlass(
        shape: LiquidRoundedSuperellipse(borderRadius: borderRadius),
        child: SizedBox(
          width: width,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}
