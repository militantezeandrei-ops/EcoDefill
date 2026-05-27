import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum ConnectivityStatus { isConnected, isDisconnected }

class ConnectivityNotifier extends StateNotifier<ConnectivityStatus> {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription? _subscription;

  ConnectivityNotifier() : super(ConnectivityStatus.isConnected) {
    _init();
  }

  void _init() async {
    final result = await _connectivity.checkConnectivity();
    _updateStatus(result);
    
    // Listen to subsequent changes
    _subscription = _connectivity.onConnectivityChanged.listen((ConnectivityResult result) {
      _updateStatus(result);
    });
  }

  void _updateStatus(ConnectivityResult result) {
    if (result == ConnectivityResult.none) {
      state = ConnectivityStatus.isDisconnected;
    } else {
      state = ConnectivityStatus.isConnected;
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final connectivityProvider = StateNotifierProvider<ConnectivityNotifier, ConnectivityStatus>((ref) {
  return ConnectivityNotifier();
});
