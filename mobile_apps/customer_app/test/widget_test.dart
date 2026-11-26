import 'package:customer_app/app.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('bootstrap shows Captain Truck brand', (tester) async {
    await tester.pumpWidget(const CaptainTruckCustomerApp());
    await tester.pump();

    expect(find.text('Captain Truck'), findsOneWidget);
    expect(find.textContaining('Phase C0'), findsOneWidget);
    expect(find.text('API health'), findsOneWidget);
  });
}
