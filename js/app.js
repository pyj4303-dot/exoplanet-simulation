/**
 * Main Application Orchestrator for Exoplanet Simulator
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Physics Engine
  const physics = new PhysicsEngine({
    mStarSun: 1.0,
    mPlanetJup: 1.0,
    rStarSun: 1.0,
    rPlanetJup: 1.0,
    semiMajorAxisAU: 0.1,
    inclinationDeg: 0.0, // 0 deg = parallel to line of sight
    eccentricity: 0.0
  });

  // 2. Initialize Renderers
  const rvOrbitRenderer = new OrbitViewRenderer('orbitCanvas', 'spectrumCanvas');
  const rvChartRenderer = new ChartRenderer('rvChartCanvas');

  const transitOrbitRenderer = new OrbitViewRenderer('transitCanvas', null);
  transitOrbitRenderer.setViewMode('transit');
  const lightCurveChartRenderer = new ChartRenderer('lightCurveChartCanvas');

  // Microlensing (Screen 3)
  const microPhysics = new MicrolensingPhysics({
    mLensSun: 0.5,
    mPlanetJup: 3.0,
    u0: 0.20,
    s: 1.05,
    phiDeg: 45.0,
    tE_days: 30.0
  });
  const microViewRenderer = new MicrolensingViewRenderer('microlensingCanvas');
  const microChartRenderer = new MicrolensingChartRenderer('microlensingChartCanvas');

  // State Variables
  let isPlaying = true;
  let animSpeed = 1.0;
  let currentPhase = 0.0;
  let transitTimeDays = 0.0;
  let microTimeDays = -30.0;
  let activeTab = 'rv';
  let isCompareMode = false;
  let compareData = null;
  let comparePhysics = null;

  // Cache DOM Elements
  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnResetPhase = document.getElementById('btnResetPhase');
  const speedSelect = document.getElementById('speedSelect');
  const btnCompare = document.getElementById('btnCompare');
  const presetSelect = document.getElementById('presetSelect');
  const btnInfoModal = document.getElementById('btnInfoModal');
  const infoModal = document.getElementById('infoModal');
  const btnCloseModal = document.getElementById('btnCloseModal');

  // Sliders for RV (Screen 1)
  const inputPlanetMass = document.getElementById('inputPlanetMass');
  const inputStarMass = document.getElementById('inputStarMass');
  const inputInclination = document.getElementById('inputInclination');
  const inputSemiMajor = document.getElementById('inputSemiMajor');
  const inputEccentricity = document.getElementById('inputEccentricity');

  // Sliders for Transit (Screen 2)
  const inputPlanetMassTransit = document.getElementById('inputPlanetMassTransit');
  const inputStarMassTransit = document.getElementById('inputStarMassTransit');
  const inputPlanetRadius = document.getElementById('inputPlanetRadius');
  const inputStarRadius = document.getElementById('inputStarRadius');
  const inputInclinationTransit = document.getElementById('inputInclinationTransit');
  const inputSemiMajorTransit = document.getElementById('inputSemiMajorTransit');

  // Value Display Labels
  const valPlanetMass = document.getElementById('valPlanetMass');
  const valStarMass = document.getElementById('valStarMass');
  const valPlanetMassTransit = document.getElementById('valPlanetMassTransit');
  const valStarMassTransit = document.getElementById('valStarMassTransit');
  const valInclination = document.getElementById('valInclination');
  const valSemiMajor = document.getElementById('valSemiMajor');
  const valEccentricity = document.getElementById('valEccentricity');

  const valPlanetRadius = document.getElementById('valPlanetRadius');
  const valStarRadius = document.getElementById('valStarRadius');
  const valInclinationTransit = document.getElementById('valInclinationTransit');
  const valSemiMajorTransit = document.getElementById('valSemiMajorTransit');

  // Stats Text
  const statPeriod = document.getElementById('statPeriod');
  const statPeriodTransit = document.getElementById('statPeriodTransit');
  const statK = document.getElementById('statK');
  const rvAmplitudeText = document.getElementById('rvAmplitudeText');
  const statTransitDepth = document.getElementById('statTransitDepth');
  const statImpactParam = document.getElementById('statImpactParam');
  const lightCurveDepthText = document.getElementById('lightCurveDepthText');
  const transitStatusText = document.getElementById('transitStatusText');

  // Microlensing Elements (Screen 3)
  const inputPlanetMassMicro = document.getElementById('inputPlanetMassMicro');
  const inputLensStarMass = document.getElementById('inputLensStarMass');
  const inputImpactParamMicro = document.getElementById('inputImpactParamMicro');
  const inputPlanetSepMicro = document.getElementById('inputPlanetSepMicro');
  const inputPlanetPhiMicro = document.getElementById('inputPlanetPhiMicro');
  const inputCrossingTimeMicro = document.getElementById('inputCrossingTimeMicro');

  const valPlanetMassMicro = document.getElementById('valPlanetMassMicro');
  const valLensStarMass = document.getElementById('valLensStarMass');
  const valImpactParamMicro = document.getElementById('valImpactParamMicro');
  const valPlanetSepMicro = document.getElementById('valPlanetSepMicro');
  const valPlanetPhiMicro = document.getElementById('valPlanetPhiMicro');
  const valCrossingTimeMicro = document.getElementById('valCrossingTimeMicro');

  const statMaxMagnification = document.getElementById('statMaxMagnification');
  const statPlanetDeltaA = document.getElementById('statPlanetDeltaA');
  const statPlanetPeakTime = document.getElementById('statPlanetPeakTime');
  const microlensingMaxAText = document.getElementById('microlensingMaxAText');
  const microlensingStatusText = document.getElementById('microlensingStatusText');

  // Populate Presets Select Dropdown
  if (presetSelect && typeof EXOPLANET_PRESETS !== 'undefined') {
    EXOPLANET_PRESETS.forEach(preset => {
      const opt = document.createElement('option');
      opt.value = preset.id;
      opt.textContent = `${preset.name} (${preset.category})`;
      presetSelect.appendChild(opt);
    });
  }

  // Tab Switch Handler
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      activeTab = btn.dataset.tab;
      document.getElementById('rvTabContent').classList.toggle('active', activeTab === 'rv');
      document.getElementById('transitTabContent').classList.toggle('active', activeTab === 'transit');
      document.getElementById('microlensingTabContent').classList.toggle('active', activeTab === 'microlensing');

      setTimeout(() => {
        rvOrbitRenderer.resizeCanvas();
        rvChartRenderer.resizeCanvas();
        transitOrbitRenderer.resizeCanvas();
        lightCurveChartRenderer.resizeCanvas();
        microViewRenderer.resizeCanvas();
        microChartRenderer.resizeCanvas();
      }, 50);
    });
  });

  function loadPreset(presetId) {
    const preset = EXOPLANET_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const p = preset.params;
    if (inputPlanetMass) inputPlanetMass.value = p.mPlanetJup;
    if (inputPlanetMassTransit) inputPlanetMassTransit.value = p.mPlanetJup;
    if (inputStarMass) inputStarMass.value = p.mStarSun;
    if (inputStarMassTransit) inputStarMassTransit.value = p.mStarSun;
    if (inputInclination) inputInclination.value = p.inclinationDeg;
    if (inputSemiMajor) inputSemiMajor.value = p.semiMajorAxisAU;
    if (inputEccentricity) inputEccentricity.value = p.eccentricity;

    if (inputPlanetRadius) inputPlanetRadius.value = p.rPlanetJup;
    if (inputStarRadius) inputStarRadius.value = p.rStarSun;
    if (inputInclinationTransit) inputInclinationTransit.value = p.inclinationDeg;
    if (inputSemiMajorTransit) inputSemiMajorTransit.value = p.semiMajorAxisAU;

    updatePhysicsFromInputs();
  }

  function updatePhysicsFromInputs(changedSlider) {
    let mP = 1.0;
    let mS = 1.0;

    if (changedSlider === inputPlanetMassTransit && inputPlanetMassTransit) {
      mP = parseFloat(inputPlanetMassTransit.value);
    } else if (changedSlider === inputPlanetMass && inputPlanetMass) {
      mP = parseFloat(inputPlanetMass.value);
    } else if (activeTab === 'transit' && inputPlanetMassTransit) {
      mP = parseFloat(inputPlanetMassTransit.value);
    } else {
      mP = parseFloat(inputPlanetMass ? inputPlanetMass.value : 1.0);
    }

    if (changedSlider === inputStarMassTransit && inputStarMassTransit) {
      mS = parseFloat(inputStarMassTransit.value);
    } else if (changedSlider === inputStarMass && inputStarMass) {
      mS = parseFloat(inputStarMass.value);
    } else if (activeTab === 'transit' && inputStarMassTransit) {
      mS = parseFloat(inputStarMassTransit.value);
    } else {
      mS = parseFloat(inputStarMass ? inputStarMass.value : 1.0);
    }

    let inc = 0;
    if (changedSlider === inputInclinationTransit && inputInclinationTransit) {
      inc = parseFloat(inputInclinationTransit.value);
    } else if (changedSlider === inputInclination && inputInclination) {
      inc = parseFloat(inputInclination.value);
    } else if (activeTab === 'transit' && inputInclinationTransit) {
      inc = parseFloat(inputInclinationTransit.value);
    } else {
      inc = parseFloat(inputInclination ? inputInclination.value : 0);
    }

    let a = 0.1;
    if (changedSlider === inputSemiMajorTransit && inputSemiMajorTransit) {
      a = parseFloat(inputSemiMajorTransit.value);
    } else if (changedSlider === inputSemiMajor && inputSemiMajor) {
      a = parseFloat(inputSemiMajor.value);
    } else if (activeTab === 'transit' && inputSemiMajorTransit) {
      a = parseFloat(inputSemiMajorTransit.value);
    } else {
      a = parseFloat(inputSemiMajor ? inputSemiMajor.value : 0.1);
    }

    const ecc = parseFloat(inputEccentricity ? inputEccentricity.value : 0);

    const rP = parseFloat(inputPlanetRadius ? inputPlanetRadius.value : 1.0);
    const rS = parseFloat(inputStarRadius ? inputStarRadius.value : 1.0);

    if (inputPlanetMass) inputPlanetMass.value = mP;
    if (inputPlanetMassTransit) inputPlanetMassTransit.value = mP;
    if (inputStarMass) inputStarMass.value = mS;
    if (inputStarMassTransit) inputStarMassTransit.value = mS;
    if (inputInclination) inputInclination.value = inc;
    if (inputInclinationTransit) inputInclinationTransit.value = inc;
    if (inputSemiMajor) inputSemiMajor.value = a;
    if (inputSemiMajorTransit) inputSemiMajorTransit.value = a;

    const getIncLabel = (deg) => {
      if (deg === 0) return '0.0° (평행 - 최대 시선속도)';
      if (deg === 90) return '90.0° (수직 - 시선속도 0)';
      return `${deg.toFixed(1)}°`;
    };

    if (valPlanetMass) valPlanetMass.textContent = `${mP.toFixed(2)} M_Jup`;
    if (valPlanetMassTransit) valPlanetMassTransit.textContent = `${mP.toFixed(2)} M_Jup`;
    if (valStarMass) valStarMass.textContent = `${mS.toFixed(2)} M_Sun`;
    if (valStarMassTransit) valStarMassTransit.textContent = `${mS.toFixed(2)} M_Sun`;
    if (valInclination) valInclination.textContent = getIncLabel(inc);
    if (valSemiMajor) valSemiMajor.textContent = `${a.toFixed(2)} AU`;
    if (valEccentricity) valEccentricity.textContent = `${ecc.toFixed(2)}`;

    if (valPlanetRadius) valPlanetRadius.textContent = `${rP.toFixed(2)} R_Jup`;
    if (valStarRadius) valStarRadius.textContent = `${rS.toFixed(2)} R_Sun`;
    if (valInclinationTransit) valInclinationTransit.textContent = getIncLabel(inc);
    if (valSemiMajorTransit) valSemiMajorTransit.textContent = `${a.toFixed(3)} AU`;

    physics.updateParams({
      mStarSun: mS,
      mPlanetJup: mP,
      rStarSun: rS,
      rPlanetJup: rP,
      semiMajorAxisAU: a,
      inclinationDeg: inc,
      eccentricity: ecc
    });
  }

  const allSliders = [
    inputPlanetMass, inputStarMass, inputInclination, inputSemiMajor, inputEccentricity,
    inputPlanetMassTransit, inputStarMassTransit,
    inputPlanetRadius, inputStarRadius, inputInclinationTransit, inputSemiMajorTransit
  ];

  allSliders.forEach(slider => {
    if (slider) {
      slider.addEventListener('input', (e) => {
        if (presetSelect) presetSelect.value = 'custom';
        updatePhysicsFromInputs(e.target);
      });
    }
  });

  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      if (e.target.value !== 'custom') {
        loadPreset(e.target.value);
      }
    });
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      isPlaying = !isPlaying;
      btnPlayPause.textContent = isPlaying ? '⏸' : '▶';
    });
  }

  if (btnResetPhase) {
    btnResetPhase.addEventListener('click', () => {
      currentPhase = 0.0;
      transitTimeDays = 0.0;
      microTimeDays = -microPhysics.tSpanDays / 2;
    });
  }

  // Microlensing Slider Handlers
  function updateMicrolensingFromInputs() {
    const mP = parseFloat(inputPlanetMassMicro ? inputPlanetMassMicro.value : 3.0);
    const mL = parseFloat(inputLensStarMass ? inputLensStarMass.value : 0.5);
    const u0 = parseFloat(inputImpactParamMicro ? inputImpactParamMicro.value : 0.20);
    const s = parseFloat(inputPlanetSepMicro ? inputPlanetSepMicro.value : 1.05);
    const phi = parseFloat(inputPlanetPhiMicro ? inputPlanetPhiMicro.value : 45.0);
    const tE = parseFloat(inputCrossingTimeMicro ? inputCrossingTimeMicro.value : 30.0);

    if (valPlanetMassMicro) valPlanetMassMicro.textContent = `${mP.toFixed(2)} M_Jup`;
    if (valLensStarMass) valLensStarMass.textContent = `${mL.toFixed(2)} M_Sun`;
    if (valImpactParamMicro) valImpactParamMicro.textContent = `${u0.toFixed(2)} θ_E`;
    if (valPlanetSepMicro) valPlanetSepMicro.textContent = `${s.toFixed(2)} θ_E`;
    if (valPlanetPhiMicro) valPlanetPhiMicro.textContent = `${phi.toFixed(1)}°`;
    if (valCrossingTimeMicro) valCrossingTimeMicro.textContent = `${tE.toFixed(1)} 일`;

    microPhysics.updateParams({
      mLensSun: mL,
      mPlanetJup: mP,
      u0: u0,
      s: s,
      phiDeg: phi,
      tE_days: tE
    });
  }

  const microSliders = [
    inputPlanetMassMicro, inputLensStarMass, inputImpactParamMicro,
    inputPlanetSepMicro, inputPlanetPhiMicro, inputCrossingTimeMicro
  ];
  microSliders.forEach(slider => {
    if (slider) {
      slider.addEventListener('input', () => {
        updateMicrolensingFromInputs();
      });
    }
  });
  updateMicrolensingFromInputs();

  if (speedSelect) {
    speedSelect.addEventListener('change', (e) => {
      animSpeed = parseFloat(e.target.value);
    });
  }

  if (btnCompare) {
    btnCompare.addEventListener('click', () => {
      isCompareMode = !isCompareMode;
      btnCompare.classList.toggle('active', isCompareMode);

      if (isCompareMode) {
        comparePhysics = new PhysicsEngine(Object.assign({}, physics.params));
        compareData = comparePhysics.generateFullOrbitData();
        btnCompare.textContent = '📊 비교 취소';
      } else {
        comparePhysics = null;
        compareData = null;
        btnCompare.textContent = '📊 비교 모드';
      }
    });
  }

  if (btnInfoModal && infoModal) {
    btnInfoModal.addEventListener('click', () => infoModal.style.display = 'flex');
    if (btnCloseModal) btnCloseModal.addEventListener('click', () => infoModal.style.display = 'none');
    infoModal.addEventListener('click', (e) => {
      if (e.target === infoModal) infoModal.style.display = 'none';
    });
  }

  updatePhysicsFromInputs();

  let lastTime = performance.now();

  function animate(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (isPlaying) {
      const phaseDelta = (dt / 8.0) * animSpeed;
      currentPhase = (currentPhase + phaseDelta) % 1.0;
    }

    const currentState = physics.getStateAtPhase(currentPhase);
    const fullData = physics.generateFullOrbitData();

    if (statPeriod) statPeriod.textContent = `${physics.periodDays.toFixed(1)} 일`;
    if (statPeriodTransit) statPeriodTransit.textContent = `${physics.periodDays.toFixed(1)} 일`;
    if (statK) statK.textContent = `${physics.K.toFixed(2)} m/s`;
    if (rvAmplitudeText) rvAmplitudeText.textContent = `진폭 K: ${physics.K.toFixed(2)} m/s`;

    if (statTransitDepth) statTransitDepth.textContent = `${fullData.maxDepthPercent} %`;
    if (statImpactParam) statImpactParam.textContent = `${fullData.impactParameter}`;
    if (lightCurveDepthText) lightCurveDepthText.textContent = `식 깊이 ΔF: ${fullData.maxDepthPercent} %`;

    if (activeTab === 'rv') {
      rvOrbitRenderer.render(physics, currentState);
      rvChartRenderer.renderRadialVelocity(
        fullData.rvData, 
        currentPhase, 
        physics.K, 
        fullData.periodDays, 
        fullData.rvTimeSpanDays, 
        compareData
      );
    } else if (activeTab === 'transit') {
      if (isPlaying) {
        const daysDelta = (dt / 8.0) * animSpeed * physics.periodDays;
        transitTimeDays += daysDelta;
      }
      const transitPhase = ((transitTimeDays / physics.periodDays) % 1.0 + 1.0) % 1.0;
      const transitState = physics.getStateAtPhase(transitPhase);

      if (transitStatusText) {
        if (transitState.isTransiting) {
          transitStatusText.textContent = '● 1차 식(Primary Transit) 진행 중 - 행성이 항성 앞을 가림';
          transitStatusText.style.color = 'var(--primary-green)';
        } else {
          const relX = (transitState.planetPos.x - transitState.starPos.x);
          const relY = (transitState.planetPos.y - transitState.starPos.y);
          const projDistMeters = Math.sqrt(relX * relX + relY * relY);
          const isBehindZ = transitState.planetPos.z <= transitState.starPos.z;
          const isOcculted = isBehindZ && (projDistMeters < physics.rStar + physics.rPlanet);

          if (isOcculted) {
            transitStatusText.textContent = '● 2차 식(Secondary Eclipse) - 행성이 항성 뒤로 가려짐';
            transitStatusText.style.color = 'var(--primary-pink)';
          } else {
            transitStatusText.textContent = '● 행성 관측 가능 (항성에 가려지지 않음 - 보임)';
            transitStatusText.style.color = 'var(--primary-cyan)';
          }
        }
      }

      // 동적 슬라이딩 윈도우 계산: 2.5주기 폭을 유지하며 1.8주기 이후 시간축이 우측으로 계속 전진
      const windowSpanDays = physics.periodDays * 2.5;
      const startDays = transitTimeDays < physics.periodDays * 1.8 
        ? 0.0 
        : transitTimeDays - physics.periodDays * 1.8;
      const endDays = startDays + windowSpanDays;
      const windowData = physics.generateLightCurveWindow(startDays, endDays);

      let compareWindowData = null;
      if (isCompareMode && comparePhysics) {
        compareWindowData = comparePhysics.generateLightCurveWindow(startDays, endDays);
      }

      transitOrbitRenderer.render(physics, transitState);
      lightCurveChartRenderer.renderLightCurve(
        windowData, 
        transitTimeDays, 
        fullData.maxDepthPercent, 
        fullData.hasTransit, 
        physics.periodDays, 
        startDays, 
        endDays, 
        compareWindowData ? { lightCurveData: compareWindowData } : null
      );
    } else if (activeTab === 'microlensing') {
      const halfSpan = microPhysics.tSpanDays / 2;
      if (isPlaying) {
        // -30일에서 +30일까지 약 12초에 걸쳐 통과
        const dtDays = (dt / 12.0) * animSpeed * microPhysics.tSpanDays;
        microTimeDays += dtDays;
        if (microTimeDays > halfSpan) {
          microTimeDays = -halfSpan;
        }
      }

      const microState = microPhysics.getStateAtTime(microTimeDays);
      const microFullData = microPhysics.generateLightCurve();

      if (microlensingMaxAText) {
        microlensingMaxAText.textContent = `최대 증폭 A: ${microFullData.maxA.toFixed(2)} 배`;
      }
      if (statMaxMagnification) {
        statMaxMagnification.textContent = `${microFullData.maxA.toFixed(2)} 배`;
      }
      if (statPlanetDeltaA) {
        statPlanetDeltaA.textContent = `+${microFullData.maxDeltaA.toFixed(2)} 배`;
      }
      if (statPlanetPeakTime) {
        const sign = microFullData.planetPeakTime >= 0 ? '+' : '';
        statPlanetPeakTime.textContent = `${sign}${microFullData.planetPeakTime.toFixed(1)} 일`;
      }
      if (microlensingStatusText) {
        if (microState.isNearPlanet) {
          microlensingStatusText.textContent = '★ 행성 중력 렌즈 미세 피크 발생 중!';
          microlensingStatusText.style.color = 'var(--primary-green)';
        } else {
          microlensingStatusText.textContent = '● 렌즈계가 배경별 앞을 통과하는 중';
          microlensingStatusText.style.color = 'var(--primary-cyan)';
        }
      }

      microViewRenderer.render(microPhysics, microState);
      microChartRenderer.render(
        microFullData.data,
        microTimeDays,
        microFullData.maxA,
        microFullData.maxDeltaA,
        microFullData.planetPeakTime
      );
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
});
