import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ecodefill_mobile/core/storage/local_cache.dart';
import 'package:ecodefill_mobile/core/theme/app_theme.dart';
import 'package:ecodefill_mobile/features/auth/providers/auth_provider.dart';
import 'package:ecodefill_mobile/features/auth/screens/login_screen.dart';
import 'package:ecodefill_mobile/features/shell/screens/shell_layout.dart';
import 'package:ecodefill_mobile/core/widgets/connectivity_wrapper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Hive storage cache
  await LocalCache.instance.init();

  runApp(
    const ProviderScope(
      child: EcoDefillApp(),
    ),
  );
}

class EcoDefillApp extends ConsumerWidget {
  const EcoDefillApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    Widget homeWidget;
    if (authState.isLoading) {
      homeWidget = const Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            color: AppTheme.primaryEmerald,
          ),
        ),
      );
    } else if (authState.isAuthenticated) {
      homeWidget = const ShellLayout();
    } else {
      homeWidget = const LoginScreen();
    }

    return MaterialApp(
      title: 'EcoDefill',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: homeWidget,
      builder: (context, child) {
        return ConnectivityWrapper(child: child!);
      },
    );
  }
}
