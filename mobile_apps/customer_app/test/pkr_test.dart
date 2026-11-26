import 'package:customer_app/core/money/pkr.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('formatPkrCents formats whole and fractional rupees', () {
    expect(formatPkrCents(null), '—');
    expect(formatPkrCents(0), 'PKR 0');
    expect(formatPkrCents(100000), 'PKR 1,000');
    expect(formatPkrCents(125050), 'PKR 1,250.50');
  });
}
