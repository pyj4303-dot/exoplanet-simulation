/**
 * Exoplanet Preset Configurations
 * Inclination Convention:
 * 0° = 시선방향과 공전궤도면이 평행 (Edge-on: 최대 시선속도 & 식현상 발생)
 * 90° = 시선방향과 공전궤도면이 수직 (Face-on: 시선속도 0 & 식현상 미발생)
 */

const EXOPLANET_PRESETS = [
  {
    id: "51_peg_b",
    name: "51 Pegasi b (디미디움)",
    category: "Hot Jupiter",
    description: "주계열성 주변에서 최초로 발견된 역사적인 외계행성. 매우 가까운 궤도(0.052 AU)를 돌며 시선속도법으로 발견되었습니다.",
    params: {
      mStarSun: 1.11,
      mPlanetJup: 0.47,
      rStarSun: 1.24,
      rPlanetJup: 1.2,
      semiMajorAxisAU: 0.052,
      inclinationDeg: 10.0, // ~10 deg from edge-on
      eccentricity: 0.01
    }
  },
  {
    id: "hd_209458_b",
    name: "HD 209458 b (오시리스)",
    category: "Transiting Hot Jupiter",
    description: "최초로 대기 성분이 관측된 대표적 통과(식현상) 행성. 강렬한 시선속도 및 명확한 광도감소를 모두 보여줍니다.",
    params: {
      mStarSun: 1.15,
      mPlanetJup: 0.69,
      rStarSun: 1.20,
      rPlanetJup: 1.38,
      semiMajorAxisAU: 0.047,
      inclinationDeg: 3.4, // ~3.4 deg from edge-on
      eccentricity: 0.0
    }
  },
  {
    id: "trappist_1e",
    name: "TRAPPIST-1e",
    category: "Earth-like Habitable Planet",
    description: "초왜성 주변을 도는 지구 크기의 골디락스 존(해비터블 존) 행성. 식현상 기법으로 대기 및 크기가 측정되었습니다.",
    params: {
      mStarSun: 0.09,
      mPlanetJup: 0.0022,
      rStarSun: 0.12,
      rPlanetJup: 0.082,
      semiMajorAxisAU: 0.029,
      inclinationDeg: 0.2, // Edge-on
      eccentricity: 0.008
    }
  },
  {
    id: "kepler_186f",
    name: "Kepler-186f",
    category: "Earth Cousin",
    description: "M형 왜성 골디락스 존에서 발견된 최초의 지구 크기 암석형 외계행성.",
    params: {
      mStarSun: 0.54,
      mPlanetJup: 0.0045,
      rStarSun: 0.52,
      rPlanetJup: 0.104,
      semiMajorAxisAU: 0.432,
      inclinationDeg: 0.1, // Edge-on
      eccentricity: 0.04
    }
  },
  {
    id: "sun_jupiter",
    name: "태양 - 목성 계 (Sun - Jupiter)",
    category: "Solar System",
    description: "우리 태양계의 기준 모델. 태양이 목성에 의해 흔들리는 시선속도(약 12.5 m/s)와 식현상 광도변화(약 1%)의 기준점입니다.",
    params: {
      mStarSun: 1.0,
      mPlanetJup: 1.0,
      rStarSun: 1.0,
      rPlanetJup: 1.0,
      semiMajorAxisAU: 1.0,
      inclinationDeg: 0.0, // Edge-on (0 deg parallel)
      eccentricity: 0.05
    }
  }
];

window.EXOPLANET_PRESETS = EXOPLANET_PRESETS;
