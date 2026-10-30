/**
 * Microlensing Simulation Module for Exoplanet Exploration Simulator
 * 
 * Compliant with Korean Earth Science (지구과학 I·II) Curriculum:
 * 1. 상단: 관측 기하도 (Side View / Ray Tracing Diagram)
 *    - [관측자 (지구)] <--- [전경 렌즈계 (별+행성)] <--- [배경별 (먼 별)]
 *    - 중력에 의해 휘어져 관측자에게 모여드는 빛의 경로(광선 굴절) 표시
 * 2. 하단: 천구 관측 뷰 (Observer Sky View)
 *    - 아인슈타인 링 및 2개의 왜곡된 렌즈 상(Arc)
 *    - 외계 행성에 의한 추가 집광 및 광채 증폭
 * 3. 그래프: 대칭형 주 피크(Paczynski) + 외계 행성에 의한 날카롭고 뚜렷한 미세 피크(Anomaly Peak)
 */

class MicrolensingPhysics {
  constructor(params = {}) {
    this.updateParams(params);
  }

  updateParams(params) {
    this.mLensSun = params.mLensSun ?? 0.5;         // 렌즈 별 질량 (M_Sun, 0.1 ~ 2.0)
    this.mPlanetJup = params.mPlanetJup ?? 3.0;     // 외계 행성 질량 (M_Jup, 0.1 ~ 20.0) - 확실한 변화를 위해 기본 3.0 M_Jup
    this.u0 = params.u0 ?? 0.20;                    // 최소 접근 거리 / 임팩트 파라미터 (theta_E, 0.05 ~ 0.60)
    this.s = params.s ?? 1.05;                      // 행성-별 투영 분리 거리 (theta_E, 0.60 ~ 1.60)
    this.phiDeg = params.phiDeg ?? 45.0;            // 행성 위치각 (도, 0 ~ 360)
    this.tE_days = params.tE_days ?? 30.0;          // 아인슈타인 반경 교차 시간 (일, 15 ~ 50)
    this.tSpanDays = params.tSpanDays ?? 60.0;      // 전체 관측 기간 (일, -30일 ~ +30일)

    // 질량비 q = m_p / (M_L * 1047)
    this.q = this.mPlanetJup / (this.mLensSun * 1047);
    this.phiRad = (this.phiDeg * Math.PI) / 180;

    // 행성의 상대 위치 (렌즈 별 기준, theta_E 단위)
    // 교육적 명확성을 위해: phi=45° 근처에서 t ≈ +3~6일 경 행성이 배경별 시선 궤적 근처를 스쳐지나가도록 기하학 배치
    this.planetRelX = this.s * Math.cos(this.phiRad);
    this.planetRelY = this.s * Math.sin(this.phiRad) - this.u0; 

    // 이론상 렌즈별 단독 최대 증폭률
    this.A_max_star = (this.u0 * this.u0 + 2) / (this.u0 * Math.sqrt(this.u0 * this.u0 + 4));
  }

  /**
   * Calculates magnification and positions at time tDays
   */
  getStateAtTime(tDays) {
    const tNorm = tDays / this.tE_days;

    // 렌즈 별의 천구면 위치 (배경별 (0,0) 기준, theta_E 단위)
    // t=0 일 때 x=0, y=u0 (최접근 거리)
    const starX = tNorm;
    const starY = this.u0;
    const uStar = Math.sqrt(starX * starX + starY * starY);

    // 렌즈 별에 의한 Paczynski 기본 대칭 증폭률
    const A_star = (uStar * uStar + 2) / (Math.max(1e-4, uStar) * Math.sqrt(uStar * uStar + 4));

    // 행성의 천구면 위치 (배경별 기준, theta_E 단위)
    const planetX = starX - this.planetRelX;
    const planetY = starY - this.planetRelY;
    const uPlanet = Math.sqrt(planetX * planetX + planetY * planetY);

    // 행성의 유효 아인슈타인 반경 rEp
    // 지구과학 학습용으로 질량에 따른 피크 변화를 확연하게 체감할 수 있도록 정밀 스케일링
    const rEp = Math.sqrt(this.q) * 2.2; 
    const uNormP = uPlanet / Math.max(1e-4, rEp);

    // 행성 섭동 피크 계산 (유한 광원 평활화 및 가우스 영향권)
    const uEffP = Math.sqrt(uNormP * uNormP + 0.02);
    const rawPlanetGain = (uEffP * uEffP + 2) / (uEffP * Math.sqrt(uEffP * uEffP + 4)) - 1;

    // 행성 질량이 클수록 영향권(너비)과 피크 높이가 확실하게 커짐!
    const influenceRadius = 1.8 * rEp + 0.04;
    const decay = Math.exp(-(uPlanet * uPlanet) / (2 * influenceRadius * influenceRadius));
    
    // 질량 비례 가중치 (외계 행성의 존재를 확연히 입증하는 선명한 피크)
    const massWeight = Math.pow(this.mPlanetJup / 1.0, 0.45);
    const deltaA = rawPlanetGain * decay * 1.65 * massWeight;

    const A_total = A_star + deltaA;

    return {
      tDays,
      starPos: { x: starX, y: starY, u: uStar },
      planetPos: { x: planetX, y: planetY, u: uPlanet },
      A_star,
      deltaA,
      A_total,
      rEp,
      isNearPlanet: deltaA > 0.35
    };
  }

  /**
   * Generates full light curve dataset
   */
  generateLightCurve(numPoints = 600) {
    const data = [];
    const halfSpan = this.tSpanDays / 2;
    let maxA = 1.0;
    let maxDeltaA = 0.0;
    let planetPeakTime = 0.0;

    for (let i = 0; i <= numPoints; i++) {
      const tDays = -halfSpan + (i / numPoints) * this.tSpanDays;
      const state = this.getStateAtTime(tDays);
      data.push({
        tDays,
        A_total: state.A_total,
        A_star: state.A_star,
        deltaA: state.deltaA
      });

      if (state.A_total > maxA) {
        maxA = state.A_total;
      }
      if (state.deltaA > maxDeltaA) {
        maxDeltaA = state.deltaA;
        planetPeakTime = tDays;
      }
    }

    return {
      data,
      tSpanDays: this.tSpanDays,
      halfSpan,
      maxA,
      maxDeltaA,
      planetPeakTime,
      A_max_star: this.A_max_star
    };
  }
}

/**
 * Microlensing Observer Sky View Renderer (Dual View: Side Profile Geometry + Telescope Sky View)
 */
class MicrolensingViewRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.canvas) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width * (window.devicePixelRatio || 1);
      this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    }
  }

  render(physics, state) {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Deep Space Background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#070b18');
    bg.addColorStop(0.5, '#0a1024');
    bg.addColorStop(1, '#050814');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Split Canvas into 2 Distinct Sections:
    // Section 1 (Top ~36%): Side Profile Geometry View (관측자(지구) - 렌즈계 - 배경별 & 광선 굴절)
    // Section 2 (Bottom ~64%): Observer Telescope Sky View (천구 렌즈 뷰)
    const splitY = Math.round(h * 0.36);

    this.renderSideProfileView(ctx, 0, 0, w, splitY, physics, state);
    this.renderTelescopeSkyView(ctx, 0, splitY, w, h - splitY, physics, state);

    // Section Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(w, splitY);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Section 1: Side Profile Geometry View (교과서식 공간 배치도 & 빛의 굴절 경로)
   */
  renderSideProfileView(ctx, x, y, w, h, physics, state) {
    ctx.save();

    // Section Header
    ctx.fillStyle = 'rgba(0, 229, 255, 0.95)';
    ctx.font = 'bold 13.5px sans-serif';
    ctx.fillText('📐 [1] 시선 방향 관측 기하도 (Side Profile View) : 빛의 굴절과 집광', x + 16, y + 24);

    const centerY = y + h * 0.58;

    // 3 Key Positions:
    // Left: 관측자 (지구, Earth)
    const observerX = x + w * 0.14;
    // Center: 전경 렌즈계 (렌즈 별 + 외계 행성)
    const lensX = x + w * 0.52;
    // Right: 배경별 (Source Star, 먼 별)
    const sourceX = x + w * 0.88;

    // 1. Draw Optical Line of Sight Axis (기준선)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(observerX, centerY);
    ctx.lineTo(sourceX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Dynamic Lensed Light Rays (배경별 -> 렌즈계 -> 관측자(지구) 눈으로 휘어져 모이는 광선)
    const rayGlow = state.isNearPlanet ? 'rgba(0, 255, 170, 0.95)' : 'rgba(255, 215, 0, 0.85)';
    const rayWidth = state.isNearPlanet ? 2.5 : Math.min(3.0, 1.2 * Math.sqrt(state.A_total));

    ctx.strokeStyle = rayGlow;
    ctx.lineWidth = rayWidth;
    ctx.shadowColor = rayGlow;
    ctx.shadowBlur = state.isNearPlanet ? 12 : 6;

    // Upper Ray (상단 굴절 광선: 렌즈별 위쪽을 거쳐 관측자 눈으로 집광)
    const bendOffsetY = Math.min(35, 18 * Math.sqrt(physics.mLensSun));
    ctx.beginPath();
    ctx.moveTo(sourceX, centerY);
    ctx.quadraticCurveTo(lensX, centerY - bendOffsetY, observerX, centerY);
    ctx.stroke();

    // Lower Ray (하단 굴절 광선: 렌즈별 아래쪽을 거쳐 관측자 눈으로 집광)
    ctx.beginPath();
    ctx.moveTo(sourceX, centerY);
    ctx.quadraticCurveTo(lensX, centerY + bendOffsetY, observerX, centerY);
    ctx.stroke();

    // Planet Perturbation Ray (외계 행성에 의해 추가로 굴절되는 광선!)
    if (state.isNearPlanet) {
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(sourceX, centerY);
      ctx.quadraticCurveTo(lensX + 15, centerY - bendOffsetY * 0.5, observerX, centerY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 3. Render Observer (지구 🌍 / 망원경)
    const earthR = 14;
    // Earth Atmosphere Glow
    const earthGlow = ctx.createRadialGradient(observerX, centerY, 5, observerX, centerY, earthR * 1.8);
    earthGlow.addColorStop(0, '#00e5ff');
    earthGlow.addColorStop(0.7, 'rgba(0, 100, 255, 0.4)');
    earthGlow.addColorStop(1, 'rgba(0, 50, 255, 0)');
    ctx.fillStyle = earthGlow;
    ctx.beginPath();
    ctx.arc(observerX, centerY, earthR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Earth Body
    const earthGrad = ctx.createRadialGradient(observerX - 4, centerY - 4, 2, observerX, centerY, earthR);
    earthGrad.addColorStop(0, '#4fc3f7');
    earthGrad.addColorStop(0.5, '#1976d2');
    earthGrad.addColorStop(1, '#0d47a1');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(observerX, centerY, earthR, 0, Math.PI * 2);
    ctx.fill();

    // Telescope Icon
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('🔭', observerX - 8, centerY - 18);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 12.5px sans-serif';
    ctx.fillText('관측자 (지구 / Earth)', observerX - 54, centerY + earthR + 17);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('(시선 방향 도달점)', observerX - 42, centerY + earthR + 32);

    // 4. Render Lens System (중간: 렌즈 별 + 외계 행성)
    const lensStarR = 11;
    // Lens Star Body
    const lensStarGrad = ctx.createRadialGradient(lensX - 2, centerY - 2, 2, lensX, centerY, lensStarR);
    lensStarGrad.addColorStop(0, '#ffaa66');
    lensStarGrad.addColorStop(0.6, '#e65100');
    lensStarGrad.addColorStop(1, '#bf360c');
    ctx.fillStyle = lensStarGrad;
    ctx.beginPath();
    ctx.arc(lensX, centerY, lensStarR, 0, Math.PI * 2);
    ctx.fill();

    // Planet Orbit & Exoplanet in Side View
    const planetOrbitH = 26;
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.ellipse(lensX, centerY, 8, planetOrbitH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Planet Body
    const planetSideY = centerY - 18;
    const planetR = Math.max(4.5, 3.5 * Math.cbrt(physics.mPlanetJup));
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.arc(lensX + 4, planetSideY, planetR, 0, Math.PI * 2);
    ctx.fill();

    if (state.isNearPlanet) {
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lensX + 4, planetSideY, planetR + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ff8855';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('전경 렌즈계', lensX - 30, centerY - lensStarR - 20);
    ctx.fillStyle = '#ffaa77';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.fillText('• 렌즈 별', lensX - 25, centerY + lensStarR + 17);
    ctx.fillStyle = '#00ffaa';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.fillText(`• 외계 행성 (${physics.mPlanetJup.toFixed(1)} M_Jup)`, lensX - 25, centerY + lensStarR + 32);

    // 5. Render Source Star (우측: 배경별)
    const sourceR = 12;
    const sourceGlow = ctx.createRadialGradient(sourceX, centerY, 3, sourceX, centerY, sourceR * 2.2);
    sourceGlow.addColorStop(0, '#ffffff');
    sourceGlow.addColorStop(0.4, '#ffd54f');
    sourceGlow.addColorStop(0.8, '#ff8f00');
    sourceGlow.addColorStop(1, 'rgba(255, 143, 0, 0)');
    ctx.fillStyle = sourceGlow;
    ctx.beginPath();
    ctx.arc(sourceX, centerY, sourceR * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(sourceX, centerY, sourceR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 12.5px sans-serif';
    ctx.fillText('배경별 (Source Star)', sourceX - 52, centerY - sourceR - 16);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('(먼 곳에서 빛 방출)', sourceX - 42, centerY + sourceR + 17);

    ctx.restore();
  }

  /**
   * Section 2: Observer Telescope Sky View (하단: 망원경 천구 뷰)
   */
  renderTelescopeSkyView(ctx, x, y, w, h, physics, state) {
    ctx.save();

    // Section Header
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13.5px sans-serif';
    ctx.fillText('🔭 [2] 관측자 망원경 천구 뷰 (Observer Telescope Sky View)', x + 16, y + 24);

    const centerX = x + w * 0.48;
    const centerY = y + h * 0.52;
    const scale = Math.min(w, h) * 0.42;

    // 1. Draw Optical Axis & Guide
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x + w, centerY);
    ctx.moveTo(centerX, y);
    ctx.lineTo(centerX, y + h);
    ctx.stroke();

    // 2. Trajectory Line
    const startX = centerX + (-physics.tSpanDays / (2 * physics.tE_days)) * scale;
    const endX = centerX + (physics.tSpanDays / (2 * physics.tE_days)) * scale;
    const trajY = centerY + physics.u0 * scale;

    ctx.strokeStyle = 'rgba(255, 170, 0, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startX, trajY);
    ctx.lineTo(endX, trajY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Source Star (배경별)
    const baseSourceR = 10;
    const magnifyFactor = Math.min(3.8, Math.sqrt(state.A_total));
    const sourceR = baseSourceR * magnifyFactor;

    // Glow Halo (광도 증폭에 따라 실시간 팽창)
    const haloGlow = ctx.createRadialGradient(centerX, centerY, baseSourceR * 0.5, centerX, centerY, sourceR * 3.5);
    haloGlow.addColorStop(0, state.isNearPlanet ? 'rgba(0, 255, 170, 0.95)' : 'rgba(255, 240, 180, 0.9)');
    haloGlow.addColorStop(0.3, state.isNearPlanet ? 'rgba(0, 229, 255, 0.6)' : 'rgba(255, 200, 50, 0.5)');
    haloGlow.addColorStop(0.7, 'rgba(255, 120, 0, 0.2)');
    haloGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = haloGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, sourceR * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Star Body
    ctx.fillStyle = state.isNearPlanet ? '#e6ffff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, sourceR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 12.5px sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('배경별 (Source)', centerX + 18, centerY - 14);
    ctx.shadowBlur = 0;

    // 4. Lens Star & Einstein Ring
    const lensStarX = centerX + state.starPos.x * scale;
    const lensStarY = centerY + state.starPos.y * scale;

    const einsteinRadiusPx = 1.0 * scale;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(lensStarX, lensStarY, einsteinRadiusPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Gravitational Lensed Image Arcs
    const distToCenter = Math.hypot(lensStarX - centerX, lensStarY - centerY);
    if (distToCenter > 4) {
      const angle = Math.atan2(centerY - lensStarY, centerX - lensStarX);
      const arcLen = Math.min(Math.PI * 0.75, 1.3 / Math.max(0.18, state.starPos.u));

      ctx.strokeStyle = state.isNearPlanet ? 'rgba(0, 255, 170, 0.85)' : 'rgba(255, 230, 100, 0.75)';
      ctx.lineWidth = Math.min(7, 2.5 * magnifyFactor);
      ctx.beginPath();
      ctx.arc(lensStarX, lensStarY, einsteinRadiusPx * 1.05, angle - arcLen / 2, angle + arcLen / 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 200, 80, 0.55)';
      ctx.lineWidth = Math.min(5, 1.8 * magnifyFactor);
      ctx.beginPath();
      ctx.arc(lensStarX, lensStarY, einsteinRadiusPx * 0.95, angle + Math.PI - arcLen / 3, angle + Math.PI + arcLen / 3);
      ctx.stroke();
    }

    // 5. Exoplanet Body & Micro Einstein Ring
    const planetPxX = centerX + state.planetPos.x * scale;
    const planetPxY = centerY + state.planetPos.y * scale;

    // 행성 중력 영향권 (행성 질량이 클수록 원이 커짐!)
    const planetREpPx = Math.max(12, state.rEp * scale);
    ctx.strokeStyle = state.isNearPlanet ? '#00ffaa' : 'rgba(0, 255, 170, 0.5)';
    ctx.lineWidth = state.isNearPlanet ? 2.5 : 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(planetPxX, planetPxY, planetREpPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 행성-렌즈별 연결선
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lensStarX, lensStarY);
    ctx.lineTo(planetPxX, planetPxY);
    ctx.stroke();

    // 렌즈 별 본체
    const lensStarR = Math.max(7, 9 * Math.cbrt(physics.mLensSun));
    ctx.fillStyle = '#ff7744';
    ctx.beginPath();
    ctx.arc(lensStarX, lensStarY, lensStarR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffaa77';
    ctx.font = 'bold 12px sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('렌즈 별', lensStarX + 14, lensStarY + 4);
    ctx.shadowBlur = 0;

    // 행성 본체 (질량 비례 크기)
    const planetR = Math.max(4, 3.5 * Math.cbrt(physics.mPlanetJup));
    if (state.isNearPlanet) {
      // 행성에 의한 광도 급증 시 폭발적 플래시 글로우!
      const flashGlow = ctx.createRadialGradient(planetPxX, planetPxY, 2, planetPxX, planetPxY, planetR * 4);
      flashGlow.addColorStop(0, '#ffffff');
      flashGlow.addColorStop(0.4, '#00ffaa');
      flashGlow.addColorStop(1, 'rgba(0, 255, 170, 0)');
      ctx.fillStyle = flashGlow;
      ctx.beginPath();
      ctx.arc(planetPxX, planetPxY, planetR * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.arc(planetPxX, planetPxY, planetR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00ffaa';
    ctx.font = 'bold 12.5px sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`외계 행성 (${physics.mPlanetJup.toFixed(1)} M_Jup)`, planetPxX + 12, planetPxY + 4);
    ctx.shadowBlur = 0;

    // Status Badge Box
    const badgeBoxW = Math.min(380, w - 30);
    const badgeBoxH = 46;
    ctx.fillStyle = 'rgba(12, 17, 34, 0.90)';
    ctx.strokeStyle = state.isNearPlanet ? '#00ffaa' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x + 15, y + h - 58, badgeBoxW, badgeBoxH);
    ctx.strokeRect(x + 15, y + h - 58, badgeBoxW, badgeBoxH);

    ctx.fillStyle = state.isNearPlanet ? '#00ffaa' : '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    const statusTitle = state.isNearPlanet ? '★ [외계 행성 광도 피크 발생 중!] 밝기 급증' : '● 렌즈계가 배경별 앞을 통과하는 중';
    ctx.fillText(statusTitle, x + 24, y + h - 39);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.fillText(`현재 상대 광도 증폭률: ${state.A_total.toFixed(3)} 배 (행성 섭동: +${state.deltaA.toFixed(3)}배)`, x + 24, y + h - 21);

    ctx.restore();
  }
}

/**
 * Microlensing Light Curve Chart Renderer
 */
class MicrolensingChartRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.canvas) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width * (window.devicePixelRatio || 1);
      this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    }
  }

  render(lightCurveData, currentT_days, maxA, maxDeltaA, planetPeakTime) {
    if (!this.canvas || !this.ctx || !lightCurveData || !lightCurveData.length) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const padLeft = 70;
    const padRight = 30;
    const padTop = 38;
    const padBottom = 48;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const minY = 0.8;
    const maxY = Math.max(3.5, Math.ceil(maxA * 1.20));

    const getY = (val) => {
      const norm = (val - minY) / (maxY - minY);
      const clamped = Math.max(0, Math.min(1.05, norm));
      return padTop + plotH * (1 - clamped);
    };

    const halfSpan = 30.0;
    const totalSpan = 60.0;
    const getX = (tDays) => {
      const norm = (tDays + halfSpan) / totalSpan;
      return padLeft + norm * plotW;
    };

    // Grid Background
    ctx.fillStyle = 'rgba(12, 17, 34, 0.7)';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal Y Grid Lines
    const numYSteps = 4;
    for (let i = 0; i <= numYSteps; i++) {
      const yVal = minY + ((maxY - minY) / numYSteps) * i;
      const yPos = getY(yVal);
      ctx.beginPath();
      ctx.moveTo(padLeft, yPos);
      ctx.lineTo(padLeft + plotW, yPos);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${yVal.toFixed(1)}배`, padLeft - 10, yPos + 4);
      ctx.textAlign = 'left';
    }

    // Baseline A = 1.0 Highlight Line
    const yBaseline = getY(1.0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yBaseline);
    ctx.lineTo(padLeft + plotW, yBaseline);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertical X Grid Lines (Days)
    const timeLabels = [-30, -15, 0, 15, 30];
    timeLabels.forEach(tVal => {
      const xPos = getX(tVal);
      ctx.strokeStyle = tVal === 0 ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = tVal === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(xPos, padTop);
      ctx.lineTo(xPos, padTop + plotH);
      ctx.stroke();

      ctx.fillStyle = tVal === 0 ? '#ffd700' : 'rgba(255, 255, 255, 0.85)';
      ctx.font = tVal === 0 ? 'bold 12px sans-serif' : '11.5px sans-serif';
      ctx.textAlign = 'center';
      const labelText = tVal === 0 ? '최접근 (0일)' : `${tVal > 0 ? '+' : ''}${tVal}일`;
      ctx.fillText(labelText, xPos, padTop + plotH + 20);
      ctx.textAlign = 'left';
    });

    // 1. Draw Lens Star Alone Curve (Paczynski Curve - Dashed Orange)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    lightCurveData.forEach((pt, i) => {
      const x = getX(pt.tDays);
      const y = getY(pt.A_star);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Draw Total Light Curve with Planet Anomaly Peak (Solid Neon Green)
    ctx.beginPath();
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(0, 255, 170, 0.7)';
    ctx.shadowBlur = 10;
    lightCurveData.forEach((pt, i) => {
      const x = getX(pt.tDays);
      const y = getY(pt.A_total);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Highlight Planet Anomaly Peak Area (Glow Fill between curves)
    if (maxDeltaA > 0.3) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 255, 170, 0.18)';
      ctx.beginPath();
      let started = false;
      lightCurveData.forEach(pt => {
        if (pt.deltaA > 0.05) {
          const x = getX(pt.tDays);
          const y = getY(pt.A_total);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      // Reverse trace along A_star
      for (let i = lightCurveData.length - 1; i >= 0; i--) {
        const pt = lightCurveData[i];
        if (pt.deltaA > 0.05) {
          const x = getX(pt.tDays);
          const y = getY(pt.A_star);
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Planet Peak Marker Pin & Label
      const peakX = getX(planetPeakTime);
      const peakPt = lightCurveData.find(p => Math.abs(p.tDays - planetPeakTime) < 0.25);
      const peakY = getY(peakPt ? peakPt.A_total : maxA);

      ctx.fillStyle = '#00ffaa';
      ctx.beginPath();
      ctx.arc(peakX, peakY, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Arrow and Callout
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(peakX, peakY - 6);
      ctx.lineTo(peakX, peakY - 26);
      ctx.stroke();

      ctx.save();
      const peakLabel = `★ 외계 행성 피크! (+${maxDeltaA.toFixed(2)}배)`;
      ctx.font = 'bold 13px sans-serif';
      const peakMetrics = ctx.measureText(peakLabel);
      const calloutX = Math.max(padLeft + 10, Math.min(peakX - peakMetrics.width / 2, w - padRight - peakMetrics.width - 10));
      const calloutY = peakY - 32;

      ctx.fillStyle = 'rgba(12, 17, 34, 0.88)';
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 1.2;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(calloutX - 8, calloutY - 16, peakMetrics.width + 16, 23, 6);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(calloutX - 8, calloutY - 16, peakMetrics.width + 16, 23);
        ctx.strokeRect(calloutX - 8, calloutY - 16, peakMetrics.width + 16, 23);
      }

      ctx.fillStyle = '#00ffaa';
      ctx.fillText(peakLabel, calloutX, calloutY);
      ctx.restore();
    }

    // 4. Current Time Cursor (White Dot & Vertical Line)
    const currentX = getX(currentT_days);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(currentX, padTop);
    ctx.lineTo(currentX, padTop + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    const dataLen = lightCurveData.length;
    const currentIdx = Math.min(dataLen - 1, Math.max(0, Math.floor(((currentT_days + halfSpan) / totalSpan) * dataLen)));
    const currentPt = lightCurveData[currentIdx] || lightCurveData[0];
    const currentY = getY(currentPt.A_total);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Value Tooltip on Chart
    ctx.save();
    ctx.font = 'bold 13px sans-serif';
    const dayStr = currentPt.tDays > 0 ? `+${currentPt.tDays.toFixed(1)}` : currentPt.tDays.toFixed(1);
    const valText = `t: ${dayStr}일 | 밝기: ${currentPt.A_total.toFixed(3)}배`;
    const tipMetrics = ctx.measureText(valText);
    const tipX = Math.min(currentX + 12, w - padRight - tipMetrics.width - 16);
    const tipY = Math.max(padTop + 24, currentY - 14);

    ctx.fillStyle = 'rgba(10, 15, 30, 0.90)';
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(tipX - 6, tipY - 15, tipMetrics.width + 12, 21, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(tipX - 6, tipY - 15, tipMetrics.width + 12, 21);
      ctx.strokeRect(tipX - 6, tipY - 15, tipMetrics.width + 12, 21);
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillText(valText, tipX, tipY);
    ctx.restore();

    // Legend
    ctx.fillStyle = 'rgba(255, 170, 0, 0.95)';
    ctx.font = 'bold 12.5px sans-serif';
    ctx.fillText('--- 렌즈별 단독 곡선 (행성 없을 때)', padLeft + 15, padTop + 22);

    ctx.fillStyle = '#00ffaa';
    ctx.font = 'bold 12.5px sans-serif';
    ctx.fillText('━ 외계 행성 포함 광도 곡선', padLeft + 250, padTop + 22);

    // Axis Labels
    ctx.save();
    ctx.translate(padLeft - 52, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('상대 광도 증폭률 A(t)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#00ffaa';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('시간 (일 / Days)', padLeft + plotW / 2, padTop + plotH + 38);

    ctx.restore();
  }
}

window.MicrolensingPhysics = MicrolensingPhysics;
window.MicrolensingViewRenderer = MicrolensingViewRenderer;
window.MicrolensingChartRenderer = MicrolensingChartRenderer;
