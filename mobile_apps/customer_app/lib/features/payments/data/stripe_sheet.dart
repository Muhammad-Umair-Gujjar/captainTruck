import 'package:flutter_stripe/flutter_stripe.dart';

/// Thin wrapper so PaymentSheet can be mocked in tests.
abstract class StripeSheetLauncher {
  Future<void> present({
    required String publishableKey,
    required String clientSecret,
    String merchantDisplayName = 'Captain Truck',
  });
}

class FlutterStripeSheetLauncher implements StripeSheetLauncher {
  @override
  Future<void> present({
    required String publishableKey,
    required String clientSecret,
    String merchantDisplayName = 'Captain Truck',
  }) async {
    Stripe.publishableKey = publishableKey;
    await Stripe.instance.applySettings();
    await Stripe.instance.initPaymentSheet(
      paymentSheetParameters: SetupPaymentSheetParameters(
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: merchantDisplayName,
      ),
    );
    await Stripe.instance.presentPaymentSheet();
  }
}

class FakeStripeSheetLauncher implements StripeSheetLauncher {
  var presentCount = 0;
  String? lastClientSecret;

  @override
  Future<void> present({
    required String publishableKey,
    required String clientSecret,
    String merchantDisplayName = 'Captain Truck',
  }) async {
    presentCount++;
    lastClientSecret = clientSecret;
  }
}
