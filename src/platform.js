// Thin wrapper around web-portal SDKs (Poki, CrazyGames, Playgama, ...).
// The game only talks to this object, so adding a portal later means filling in
// these hooks for that SDK without touching gameplay code. Locally they do nothing,
// except rewarded ads, which play a 3-second test ad so every ad spot can be tried.
const TEST_AD_SECONDS = 3;

export const platform = {
  name: 'local',
  async init() {},
  gameplayStart() {},
  gameplayStop() {},
  async commercialBreak() {},
  // Shows a rewarded ad; resolves true if it played to the end (give the reward), false if
  // there was none or it was skipped. With a portal SDK: Poki's rewardedBreak(),
  // CrazyGames' ad.requestAd('rewarded'), and so on.
  rewardedAd(placement) {
    return testAd(placement);
  },
};

// A full-screen stand-in for a real ad: a countdown, then the reward.
function testAd(placement) {
  return new Promise(resolve => {
    const box = document.createElement('div');
    box.className = 'test-ad';
    box.innerHTML = `<div class="test-ad-card"><small>TEST AD · ${placement}</small><b>Your ad here</b><span class="test-ad-count">${TEST_AD_SECONDS}</span><i class="test-ad-bar"></i></div>`;
    document.body.appendChild(box);
    box.querySelector('.test-ad-bar').style.animationDuration = `${TEST_AD_SECONDS}s`;
    let left = TEST_AD_SECONDS;
    const tick = setInterval(() => {
      left--;
      if (left > 0) { box.querySelector('.test-ad-count').textContent = left; return; }
      clearInterval(tick);
      box.remove();
      resolve(true);
    }, 1000);
  });
}
