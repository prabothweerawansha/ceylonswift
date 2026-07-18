(function configureCeylonSwiftRelease(global) {
  const release = Object.freeze({
    productVersion: '0.2.0.1',
    packageVersion: '0.2.0-beta.1',
    channel: 'OPEN_BETA',
    mark: 'MARK_0_2',
    launchAudience: 'BUSINESS_TUITION',
  });

  const defaultFeatures = Object.freeze({
    'public.track_parcel': Object.freeze({ state: 'ENABLED', version: 0 }),
    'public.send_parcel': Object.freeze({ state: 'COMING_SOON', version: 0 }),
    'public.join_business': Object.freeze({ state: 'ENABLED', version: 0 }),
    'public.rate_calculator': Object.freeze({ state: 'COMING_SOON', version: 0 }),
    'public.hubs': Object.freeze({ state: 'COMING_SOON', version: 0 }),
    'public.customer_signup': Object.freeze({ state: 'DISABLED', version: 0 }),
  });

  global.CEYLONSWIFT_RELEASE = release;
  global.CEYLONSWIFT_FEATURE_STATE = { ...defaultFeatures };
  global.CEYLONSWIFT_SAFE_FEATURE_DEFAULTS = defaultFeatures;
})(window);
