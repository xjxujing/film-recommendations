export const settings = {
  maxTilt: 25, // in deg
  rotationPower: 50,
  swipeThresholdVelocity: 0.3, // pixels per ms
  swipeThresholdDistance: 100, // pixels
};

// physical properties of the spring
export const physics = {
  touchResponsive: {
    friction: 50,
    tension: 2000,
  },
  animateOut: {
    friction: 30,
    tension: 400,
  },
  animateBack: {
    friction: 10,
    tension: 200,
  },
};
