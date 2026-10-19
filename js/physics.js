/**
 * Exoplanet Physics Calculation Engine
 * 
 * Line of Sight Coordinate System (지구과학 기준):
 * Observer (Earth) is looking at the system.
 * 
 * Radial Velocity v_r (DO NOT TOUCH - 100% PRESERVED):
 * Star moving DOWN (+Y) towards Earth -> Approaching -> v_r < 0 (BLUESHIFT #00e5ff)
 * Star moving UP (-Y) away from Earth -> Receding -> v_r > 0 (REDSHIFT #ff3366)
 * 
 * Transit Light Curve (Screen 2):
 * Primary Transit occurs ONLY when planet is strictly IN FRONT of star (planetZ_sky > starZ_sky).
 * Generates 2.2 orbital periods of data so TWO TRANSIT DIPS are ALWAYS clearly visible under any conditions.
 */

const CONSTANTS = {
  G: 6.67430e-11,                 // m^3 kg^-1 s^-2
  M_SUN: 1.989e30,               // kg
  M_JUP: 1.898e27,               // kg
  M_EARTH: 5.972e24,             // kg
  R_SUN: 696340000,              // m
  R_JUP: 69911000,               // m
  R_EARTH: 6371000,              // m
  AU: 1.495978707e11,            // m
  SPEED_OF_LIGHT: 299792458      // m/s
};

class PhysicsEngine {
  constructor(params = {}) {
    this.updateParams(params);
  }

  updateParams(params) {
    this.mStarSun = params.mStarSun ?? 1.0;       // Solar masses
    this.mPlanetJup = params.mPlanetJup ?? 1.0;   // Jupiter masses
    this.rStarSun = params.rStarSun ?? 1.0;       // Solar radii
    this.rPlanetJup = params.rPlanetJup ?? 1.0;   // Jupiter radii
    this.semiMajorAxisAU = params.semiMajorAxisAU ?? 0.1; // AU
    this.inclinationDeg = params.inclinationDeg ?? 0.0;   // 0° = Edge-on (Parallel), 90° = Face-on (Perpendicular)
    this.eccentricity = params.eccentricity ?? 0.0;        // 0 to 0.85
    this.argumentOfPeriastronDeg = params.argumentOfPeriastronDeg ?? 0; // Deg

    this.mStar = this.mStarSun * CONSTANTS.M_SUN;
    this.mPlanet = this.mPlanetJup * CONSTANTS.M_JUP;
    this.rStar = this.rStarSun * CONSTANTS.R_SUN;
    this.rPlanet = this.rPlanetJup * CONSTANTS.R_JUP;
    this.a = this.semiMajorAxisAU * CONSTANTS.AU;

    this.incRadUser = (this.inclinationDeg * Math.PI) / 180;
    this.sinIncFactor = Math.abs(this.inclinationDeg - 90) < 1e-4 ? 0 : Math.cos(this.incRadUser); // Factor for line-of-sight projection
    this.cosIncFactor = Math.abs(this.inclinationDeg - 0) < 1e-4 ? 0 : Math.sin(this.incRadUser); // Perpendicular projection factor

    this.ecc = Math.max(0, Math.min(0.85, this.eccentricity));
    this.omegaRad = (this.argumentOfPeriastronDeg * Math.PI) / 180;

    this.mTotal = this.mStar + this.mPlanet;
    this.period = 2 * Math.PI * Math.sqrt(Math.pow(this.a, 3) / (CONSTANTS.G * this.mTotal)); // seconds
    this.periodDays = this.period / 86400;

    this.rStarBary = (this.mPlanet / this.mTotal) * this.a;
    this.rPlanetBary = (this.mStar / this.mTotal) * this.a;

    // Radial Velocity Amplitude K (m/s) for Star (DO NOT TOUCH - PRESERVED 100%)
    const factor = Math.pow((2 * Math.PI * CONSTANTS.G) / this.period, 1 / 3);
    this.K = factor * (this.mPlanet * this.sinIncFactor) /
              (Math.pow(this.mTotal, 2 / 3) * Math.sqrt(1 - this.ecc * this.ecc));
  }

  /**
   * Calculates position, radial velocity, and transit flux at normalized phase tPhase (0.0 to 1.0)
   */
  getStateAtPhase(tPhase) {
    const meanAnomaly = (tPhase * 2 * Math.PI) % (2 * Math.PI);
    const trueAnomaly = this.solveTrueAnomaly(meanAnomaly, this.ecc);

    const rRel = (this.a * (1 - this.ecc * this.ecc)) / (1 + this.ecc * Math.cos(trueAnomaly));

    const rStar = rRel * (this.mPlanet / this.mTotal);
    const rPlanet = rRel * (this.mStar / this.mTotal);

    const theta = trueAnomaly;
    
    // Orbital positions in barycentric frame
    const starX_orb = -rStar * Math.cos(theta);
    const starY_orb = -rStar * Math.sin(theta);

    const planetX_orb = rPlanet * Math.cos(theta);
    const planetY_orb = rPlanet * Math.sin(theta);

    // 3D Projection considering inclination
    const starX_sky = starX_orb;
    const starY_sky = starY_orb * this.cosIncFactor;
    const starZ_sky = starY_orb * this.sinIncFactor;

    const planetX_sky = planetX_orb;
    const planetY_sky = planetY_orb * this.cosIncFactor;
    const planetZ_sky = planetY_orb * this.sinIncFactor;

    // Line of sight Radial Velocity v_r for Star (DO NOT TOUCH)
    const v_r = this.K * (Math.cos(theta + this.omegaRad) + this.ecc * Math.cos(this.omegaRad));
    const dopplerShiftRatio = v_r / CONSTANTS.SPEED_OF_LIGHT;

    // Transit Light Curve calculations (Screen 2)
    const dx = planetX_sky - starX_sky;
    const dy = planetY_sky - starY_sky;
    const projDistMeters = Math.sqrt(dx * dx + dy * dy);

    // Planet is IN FRONT of star disk ONLY when planetZ_sky > starZ_sky
    const isPlanetInFront = (planetZ_sky > starZ_sky);

    let relativeFlux = 1.0;
    let isTransiting = false;

    if (isPlanetInFront) {
      relativeFlux = this.calculateTransitFlux(projDistMeters);
      if (relativeFlux < 0.99999) {
        isTransiting = true;
      }
    } else {
      // Behind star: Relative flux is STRICTLY 1.0000 (NO DROP AT ALL)
      relativeFlux = 1.0;
      isTransiting = false;
    }

    return {
      tPhase,
      trueAnomaly,
      starPos: { x: starX_sky, y: starY_sky, z: starZ_sky, r: rStar },
      planetPos: { x: planetX_sky, y: planetY_sky, z: planetZ_sky, r: rPlanet },
      radialVelocity: v_r,             // m/s
      dopplerShiftRatio: dopplerShiftRatio,
      projDistMeters,
      relativeFlux,
      isTransiting,
      K: this.K,
      periodDays: this.periodDays
    };
  }

  calculateTransitFlux(d) {
    const Rs = this.rStar;
    const Rp = this.rPlanet;

    if (d >= Rs + Rp) return 1.0;

    if (d <= Rs - Rp) {
      const depth = (Rp * Rp) / (Rs * Rs);
      return 1.0 - depth;
    }

    const d2 = d * d;
    const Rs2 = Rs * Rs;
    const Rp2 = Rp * Rp;

    const alpha = Math.acos(Math.max(-1, Math.min(1, (d2 + Rs2 - Rp2) / (2 * d * Rs))));
    const beta  = Math.acos(Math.max(-1, Math.min(1, (d2 + Rp2 - Rs2) / (2 * d * Rp))));

    const overlapArea = Rs2 * alpha + Rp2 * beta - 
      0.5 * Math.sqrt(Math.max(0, (-d + Rs + Rp) * (d + Rs - Rp) * (d - Rs + Rp) * (d + Rs + Rp)));

    const starArea = Math.PI * Rs2;
    const fractionObscured = Math.max(0, Math.min(1, overlapArea / starArea));

    return 1.0 - fractionObscured;
  }

  solveTrueAnomaly(M, e) {
    if (e === 0) return M;

    let E = M;
    for (let i = 0; i < 10; i++) {
      const f = E - e * Math.sin(E) - M;
      const fPrime = 1 - e * Math.cos(E);
      E = E - f / fPrime;
    }

    const tanHalfTheta = Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2);
    let theta = 2 * Math.atan(tanHalfTheta);
    if (theta < 0) theta += 2 * Math.PI;
    return theta;
  }

  /**
   * Generates full dataset
   * RV: 1.5 P_days (100% UNCHANGED)
   * Light Curve: 2.2 P_days so TWO TRANSIT DIPS are ALWAYS clearly shown!
   */
  generateFullOrbitData(numPoints = 600) {
    const rvData = [];
    const lightCurveData = [];
    const P_days = this.periodDays;
    
    // RV Chart uses 1.5 P_days (100% UNCHANGED!)
    const rvTimeSpanDays = P_days * 1.5;
    for (let i = 0; i <= numPoints; i++) {
      const tDays = (i / numPoints) * rvTimeSpanDays;
      const phase = (tDays / P_days) % 1.0;
      const state = this.getStateAtPhase(phase);
      rvData.push({ timeDays: tDays, phase, v_r: state.radialVelocity, K: state.K });
    }

    // Light Curve Chart uses 2.2 P_days so TWO TRANSIT DIPS are ALWAYS clearly visible under any conditions!
    const lightCurveTimeSpanDays = P_days * 2.2;
    for (let i = 0; i <= numPoints; i++) {
      const tDays = (i / numPoints) * lightCurveTimeSpanDays;
      const phase = (tDays / P_days) % 1.0;
      const state = this.getStateAtPhase(phase);
      lightCurveData.push({ timeDays: tDays, phase, flux: state.relativeFlux });
    }

    const maxDepth = (Math.pow(this.rPlanet / this.rStar, 2) * 100).toFixed(4);
    const impactParameter = ((this.a / this.rStar) * this.cosIncFactor).toFixed(2);
    const hasTransit = impactParameter < (1 + this.rPlanet / this.rStar);

    return {
      rvData,
      lightCurveData,
      periodDays: P_days,
      rvTimeSpanDays,
      lightCurveTimeSpanDays,
      K: this.K,
      maxDepthPercent: maxDepth,
      impactParameter: parseFloat(impactParameter),
      hasTransit: hasTransit
    };
  }

  generateLightCurveWindow(startDays, endDays, numPoints = 600) {
    const lightCurveData = [];
    const P_days = this.periodDays;
    const span = endDays - startDays;
    for (let i = 0; i <= numPoints; i++) {
      const tDays = startDays + (i / numPoints) * span;
      const phase = ((tDays / P_days) % 1.0 + 1.0) % 1.0;
      const state = this.getStateAtPhase(phase);
      lightCurveData.push({ timeDays: tDays, phase, flux: state.relativeFlux });
    }
    return lightCurveData;
  }
}

window.PhysicsEngine = PhysicsEngine;
window.CONSTANTS = CONSTANTS;
