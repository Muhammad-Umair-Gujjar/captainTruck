import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app.dart';
import 'core/push/push_bootstrap.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  final pushTokenSource = await PushBootstrap.createTokenSource();
  runApp(CaptainTruckCustomerApp(pushTokenSource: pushTokenSource));
}
