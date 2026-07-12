# Pilot Evidence Checklist

The following items cannot be proven by source code alone and remain release gates:

- Record at least four weeks of live PTT forecast, production, waste, sellout, and override data.
- Measure forecast error by protein and day of week.
- Run the application on the physical kitchen phones/tablets under weak Wi-Fi.
- Test duplicate taps, interrupted EOD submission, shift handoff, and daylight-saving boundaries.
- Execute the database restore drill in CI and retain the artifact/log.
- Conduct one operator-led restore rehearsal before depending on the app as the sole production authority.
- Run the 50-session load smoke test and review latency and error rate.
- Document who receives production alerts and who has authority to pause deployment.
