/// Server money is integer PKR cents. Never format floats as source of truth.
String formatPkrCents(int? cents) {
  if (cents == null) return '—';
  final rupees = cents / 100;
  final whole = rupees.truncate();
  final frac = ((rupees - whole) * 100).round().abs();
  final wholeStr = _groupThousands(whole.abs());
  final sign = rupees < 0 ? '-' : '';
  if (frac == 0) return 'PKR $sign$wholeStr';
  return 'PKR $sign$wholeStr.${frac.toString().padLeft(2, '0')}';
}

String _groupThousands(int n) {
  final s = n.toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    final fromEnd = s.length - i;
    if (i > 0 && fromEnd % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  return buf.toString();
}
