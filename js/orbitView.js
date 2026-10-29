/**
 * Orbit & Doppler Spectrum Visualizer (Canvas 2D Engine)
 * 
 * Clean, high-performance rendering for 2D Orbit View, Doppler Spectrum,
 * and Observer Transit View.
 */

class OrbitViewRenderer {
  constructor(canvasId, spectrumCanvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.specCanvas = document.getElementById(spectrumCanvasId);
    this.specCtx = this.specCanvas ? this.specCanvas.getContext('2d') : null;

    this.trailHistory = [];
    this.starTrailHistory = [];
    this.maxTrailLength = 40;
    
    this.viewMode = 'orbit';
    this.transitUserZoom = 1.0;

    if (this.canvas) {
      this.canvas.addEventListener('wheel', (e) => {
        if (this.viewMode === 'transit') {
          e.preventDefault();
          const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
          this.transitUserZoom = Math.max(0.15, Math.min(5.0, (this.transitUserZoom || 1.0) * zoomDelta));
        }
      }, { passive: false });

      this.canvas.addEventListener('dblclick', () => {
        if (this.viewMode === 'transit') {
          this.transitUserZoom = 1.0;
        }
      });
    }

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.canvas) {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width * (window.devicePixelRatio || 1);
      this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    }
    if (this.specCanvas) {
      const rect = this.specCanvas.parentElement.getBoundingClientRect();
      this.specCanvas.width = rect.width * (window.devicePixelRatio || 1);
      this.specCanvas.height = rect.height * (window.devicePixelRatio || 1);
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.trailHistory = [];
    this.starTrailHistory = [];
  }

  render(engine, state) {
    if (!this.canvas || !this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Deep space background
    const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
    bgGradient.addColorStop(0, '#0c1022');
    bgGradient.addColorStop(1, '#050710');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    this.drawStars(ctx, width, height);

    const splitY = Math.round(height * 0.36);

    if (this.viewMode === 'orbit') {
      this.renderRVSideProfileView(ctx, 0, 0, width, splitY, engine, state);
      this.renderBarycentricOrbit(ctx, 0, splitY, width, height - splitY, engine, state);
    } else {
      this.renderTransitSideProfileView(ctx, 0, 0, width, splitY, engine, state);
      this.renderTransitObserverView(ctx, 0, splitY, width, height - splitY, engine, state);
    }

    // Horizontal Section Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, splitY);
    ctx.lineTo(width, splitY);
    ctx.stroke();

    ctx.restore();

    if (this.specCanvas && this.specCtx) {
      this.renderDopplerSpectrum(this.specCtx, this.specCanvas.width, this.specCanvas.height, state);
    }
  }

  drawStars(ctx, width, height) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const seed = 42;
    for (let i = 0; i < 50; i++) {
      const x = (Math.sin(i * 999 + seed) * 0.5 + 0.5) * width;
      const y = (Math.cos(i * 333 + seed) * 0.5 + 0.5) * height;
      const size = (Math.sin(i * 123) * 0.5 + 0.5) * 1.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Section 1: Side Profile View for Radial Velocity (시선 방향 3차원 관측 기하도)
   */
  renderRVSideProfileView(ctx, x, y, w, h, engine, state) {
    ctx.save();

    // Section Header
    ctx.fillStyle = 'rgba(0, 229, 255, 0.95)';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('📐 [1] 시선 방향 관측 기하도 (Side Profile View) : 궤도 경사각(i)과 도플러 효과', x + 16, y + 22);

    const centerY = y + h * 0.58;
    const observerX = x + w * 0.13;
    const systemX = x + w * 0.72;

    // 1. Line of Sight Reference Axis (시선 방향 기준선)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(observerX, centerY);
    ctx.lineTo(systemX + 45, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Dynamic Doppler Light Waves propagating from star towards observer (지구로 전파되는 도플러 빛 파동)
    const vr = state ? state.radialVelocity : 0;
    const isBlue = vr < -0.1;
    const isRed = vr > 0.1;
    const waveColor = isBlue ? '#00e5ff' : (isRed ? '#ff3366' : '#cbd5e1');
    const waveGlow = isBlue ? 'rgba(0, 229, 255, 0.6)' : (isRed ? 'rgba(255, 51, 102, 0.6)' : 'rgba(255, 255, 255, 0.3)');

    const waveK = state && state.K > 0 ? Math.min(1.0, Math.abs(vr) / (state.K * 1.2)) : 0;
    const wavelength = isBlue ? Math.max(10, 18 - 8 * waveK) : (isRed ? 18 + 14 * waveK : 18);
    const waveAmp = 6;
    const nowSec = performance.now() / 1000;
    const wavePhase = (nowSec * 50) % (wavelength * 2);

    ctx.save();
    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = waveGlow;
    ctx.shadowBlur = isBlue || isRed ? 8 : 2;

    const waveStartX = systemX - 25;
    const waveEndX = observerX + 22;
    ctx.beginPath();
    for (let px = waveStartX; px >= waveEndX; px -= 2) {
      const distFromStart = waveStartX - px;
      const angle = ((distFromStart + wavePhase) / wavelength) * (Math.PI * 2);
      const py = centerY + Math.sin(angle) * waveAmp;
      if (px === waveStartX) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Doppler wave status label above wave
    ctx.fillStyle = waveColor;
    ctx.font = 'bold 11.5px sans-serif';
    let waveLabel = '🌊 기준 파장 (시선속도 0)';
    if (isBlue) waveLabel = '🌊 청색편이 (Blueshift - 파장 압축)';
    else if (isRed) waveLabel = '🌊 적색편이 (Redshift - 파장 팽창)';
    ctx.fillText(waveLabel, x + w * 0.28, centerY - 14);

    // 3. Observer (Earth / Telescope)
    const earthR = 13;
    const earthGlow = ctx.createRadialGradient(observerX, centerY, 4, observerX, centerY, earthR * 1.8);
    earthGlow.addColorStop(0, '#00e5ff');
    earthGlow.addColorStop(0.7, 'rgba(0, 100, 255, 0.35)');
    earthGlow.addColorStop(1, 'rgba(0, 50, 255, 0)');
    ctx.fillStyle = earthGlow;
    ctx.beginPath();
    ctx.arc(observerX, centerY, earthR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    const earthGrad = ctx.createRadialGradient(observerX - 3, centerY - 3, 2, observerX, centerY, earthR);
    earthGrad.addColorStop(0, '#4fc3f7');
    earthGrad.addColorStop(0.5, '#1976d2');
    earthGrad.addColorStop(1, '#0d47a1');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(observerX, centerY, earthR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('🔭', observerX - 8, centerY - 17);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('관측자 (지구 / Earth)', observerX - 48, centerY + earthR + 15);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 10.5px sans-serif';
    ctx.fillText('(시선 방향 도달점)', observerX - 36, centerY + earthR + 28);

    // 4. Star-Planet Orbit System in Side View (3D Tilt with Inclination)
    const rOrbitPx = Math.min(w * 0.16, 52);
    const cosI = engine.sinIncFactor;
    const sinI = engine.cosIncFactor;

    const sideRadiusX = Math.max(6, rOrbitPx * Math.max(0.15, cosI));
    const sideRadiusY = Math.max(6, rOrbitPx * Math.max(0.15, sinI));

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(systemX, centerY, sideRadiusX, sideRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Barycenter (+) mark in side view
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(systemX - 5, centerY);
    ctx.lineTo(systemX + 5, centerY);
    ctx.moveTo(systemX, centerY - 5);
    ctx.lineTo(systemX, centerY + 5);
    ctx.stroke();

    // Real-time Planet position in side view
    const maxA = engine.a || 1;
    const relPlanetZ = state ? (state.planetPos.z / maxA) : 0;
    const relPlanetY = state ? (state.planetPos.y / maxA) : 0;
    const planetSideX = systemX - relPlanetZ * rOrbitPx;
    const planetSideY = centerY - relPlanetY * rOrbitPx;

    // Real-time Star position in side view
    const relStarZ = state ? (state.starPos.z / maxA) : 0;
    const relStarY = state ? (state.starPos.y / maxA) : 0;
    const starSideX = systemX - relStarZ * rOrbitPx;
    const starSideY = centerY - relStarY * rOrbitPx;

    // Orbit system connecting line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(starSideX, starSideY);
    ctx.lineTo(planetSideX, planetSideY);
    ctx.stroke();

    // Star Body in side view
    const starR = Math.max(7, Math.min(13, 8 * Math.sqrt(engine.rStarSun)));
    const starGrad = ctx.createRadialGradient(starSideX, starSideY, 1, starSideX, starSideY, starR * 1.8);
    starGrad.addColorStop(0, '#ffffff');
    starGrad.addColorStop(0.4, '#ffdd66');
    starGrad.addColorStop(1, 'rgba(255, 170, 0, 0)');
    ctx.fillStyle = starGrad;
    ctx.beginPath();
    ctx.arc(starSideX, starSideY, starR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffbb33';
    ctx.beginPath();
    ctx.arc(starSideX, starSideY, starR, 0, Math.PI * 2);
    ctx.fill();

    // Planet Body in side view
    const planetR = Math.max(4, Math.min(8, 4 * Math.cbrt(engine.rPlanetJup)));
    ctx.fillStyle = '#00ffaa';
    ctx.shadowColor = '#00ffaa';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(planetSideX, planetSideY, planetR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // System Labels
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('• 중심 항성', systemX - 25, centerY - sideRadiusY - 8);

    ctx.fillStyle = '#00ffaa';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('• 외계 행성', systemX - 25, centerY + sideRadiusY + 16);

    // 5. Inclination Status Badge in Top-Right
    const badgeW = 210;
    const badgeH = 26;
    const badgeX = x + w - badgeW - 14;
    const badgeY = y + 10;
    ctx.fillStyle = 'rgba(12, 17, 34, 0.85)';
    ctx.strokeStyle = engine.inclinationDeg === 0 ? 'rgba(0, 229, 255, 0.6)' : (engine.inclinationDeg === 90 ? 'rgba(255, 51, 102, 0.6)' : 'rgba(255, 255, 255, 0.25)');
    ctx.lineWidth = 1.2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
    }

    ctx.fillStyle = engine.inclinationDeg === 0 ? '#00e5ff' : (engine.inclinationDeg === 90 ? '#ff3366' : '#cbd5e1');
    ctx.font = 'bold 11.5px sans-serif';
    const incStatus = engine.inclinationDeg === 0 ? ' (최대 시선속도)' : (engine.inclinationDeg === 90 ? ' (시선속도 0)' : '');
    ctx.fillText(`궤도 경사각 i = ${engine.inclinationDeg.toFixed(1)}°${incStatus}`, badgeX + 10, badgeY + 17);

    ctx.restore();
  }

  /**
   * Section 1: Side Profile View for Transit (시선 방향 관측 기하도: 별빛 통로와 식현상 원리)
   */
  renderTransitSideProfileView(ctx, x, y, w, h, engine, state) {
    ctx.save();

    // Section Header
    ctx.fillStyle = 'rgba(0, 229, 255, 0.95)';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('📐 [1] 시선 방향 관측 기하도 (Side Profile View) : 시선 정렬과 식현상 발생 원리', x + 16, y + 22);

    const centerY = y + h * 0.58;
    const observerX = x + w * 0.13;
    const systemX = x + w * 0.72;

    const starR = Math.max(9, Math.min(16, 11 * Math.sqrt(engine.rStarSun)));
    const earthR = 13;

    // 1. Star-to-Earth Light Beam (지구로 향하는 별빛 원뿔 통로)
    const beamGrad = ctx.createLinearGradient(systemX, centerY, observerX, centerY);
    beamGrad.addColorStop(0, 'rgba(255, 215, 0, 0.22)');
    beamGrad.addColorStop(0.6, 'rgba(255, 215, 0, 0.10)');
    beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0.08)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(systemX, centerY - starR * 1.1);
    ctx.lineTo(observerX, centerY - earthR * 1.1);
    ctx.lineTo(observerX, centerY + earthR * 1.1);
    ctx.lineTo(systemX, centerY + starR * 1.1);
    ctx.closePath();
    ctx.fill();

    // Light Beam Boundary Rays
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(systemX, centerY - starR * 1.1);
    ctx.lineTo(observerX, centerY - earthR * 1.1);
    ctx.moveTo(systemX, centerY + starR * 1.1);
    ctx.lineTo(observerX, centerY + earthR * 1.1);
    ctx.stroke();
    ctx.setLineDash([]);

    // Line of sight central axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(observerX, centerY);
    ctx.lineTo(systemX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Light beam title
    ctx.fillStyle = 'rgba(255, 215, 0, 0.85)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('지구 망원경으로 향하는 별빛 통로 (Light Beam)', x + w * 0.26, centerY - 14);

    // 2. Observer (Earth / Telescope)
    const earthGlow = ctx.createRadialGradient(observerX, centerY, 4, observerX, centerY, earthR * 1.8);
    earthGlow.addColorStop(0, '#00e5ff');
    earthGlow.addColorStop(0.7, 'rgba(0, 100, 255, 0.35)');
    earthGlow.addColorStop(1, 'rgba(0, 50, 255, 0)');
    ctx.fillStyle = earthGlow;
    ctx.beginPath();
    ctx.arc(observerX, centerY, earthR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    const earthGrad = ctx.createRadialGradient(observerX - 3, centerY - 3, 2, observerX, centerY, earthR);
    earthGrad.addColorStop(0, '#4fc3f7');
    earthGrad.addColorStop(0.5, '#1976d2');
    earthGrad.addColorStop(1, '#0d47a1');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(observerX, centerY, earthR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('🔭', observerX - 8, centerY - 17);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('관측자 (지구 / Earth)', observerX - 48, centerY + earthR + 15);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 10.5px sans-serif';
    ctx.fillText('(시선 방향 도달점)', observerX - 36, centerY + earthR + 28);

    // 3. Planet Orbit in Side View (Tilted Orbit Plane)
    const rOrbitPx = Math.min(w * 0.16, 52);
    const cosI = engine.sinIncFactor;
    const sinI = engine.cosIncFactor;

    const sideRadiusX = Math.max(6, rOrbitPx * Math.max(0.15, cosI));
    const sideRadiusY = Math.max(6, rOrbitPx * Math.max(0.15, sinI));

    ctx.strokeStyle = state && state.isTransiting ? 'rgba(0, 255, 170, 0.5)' : 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(systemX, centerY, sideRadiusX, sideRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Star Body in side view
    const starGrad = ctx.createRadialGradient(systemX, centerY, 2, systemX, centerY, starR * 2);
    starGrad.addColorStop(0, '#ffffff');
    starGrad.addColorStop(0.3, '#ffcc44');
    starGrad.addColorStop(0.8, '#ff6600');
    starGrad.addColorStop(1, 'rgba(255, 102, 0, 0)');
    ctx.fillStyle = starGrad;
    ctx.beginPath();
    ctx.arc(systemX, centerY, starR * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffa726';
    ctx.beginPath();
    ctx.arc(systemX, centerY, starR, 0, Math.PI * 2);
    ctx.fill();

    // 5. Planet Body in side view
    const maxA = engine.a || 1;
    const relPlanetZ = state ? (state.planetPos.z / maxA) : 0;
    const relPlanetY = state ? (state.planetPos.y / maxA) : 0;
    const planetSideX = systemX - relPlanetZ * rOrbitPx;
    const planetSideY = centerY - relPlanetY * rOrbitPx;

    const planetR = Math.max(4, Math.min(9, 5 * Math.cbrt(engine.rPlanetJup)));

    // If Transiting: Draw Shadow Cone from planet towards Earth!
    if (state && state.isTransiting) {
      const shadowGrad = ctx.createLinearGradient(planetSideX, planetSideY, observerX, centerY);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');

      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.moveTo(planetSideX, planetSideY - planetR);
      ctx.lineTo(observerX, centerY - earthR * 0.7);
      ctx.lineTo(observerX, centerY + earthR * 0.7);
      ctx.lineTo(planetSideX, planetSideY + planetR);
      ctx.closePath();
      ctx.fill();

      // Shadow boundary lines
      ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(planetSideX, planetSideY - planetR);
      ctx.lineTo(observerX, centerY - earthR * 0.7);
      ctx.moveTo(planetSideX, planetSideY + planetR);
      ctx.lineTo(observerX, centerY + earthR * 0.7);
      ctx.stroke();
    }

    // Planet Circle
    if (state && state.isTransiting) {
      ctx.fillStyle = '#0a0d1a';
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(planetSideX, planetSideY, planetR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#00ffaa';
      ctx.beginPath();
      ctx.arc(planetSideX, planetSideY, planetR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = '#ffaa66';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('• 중심 항성', systemX - 25, centerY - sideRadiusY - 8);

    ctx.fillStyle = state && state.isTransiting ? '#00ffaa' : '#00e5ff';
    ctx.font = 'bold 11px sans-serif';
    const planetText = state && state.isTransiting ? '• 외계 행성 (식 진행 중 - 별빛 차폐)' : '• 외계 행성';
    ctx.fillText(planetText, systemX - 35, centerY + sideRadiusY + 16);

    // 6. Real-time Status Pill in Top-Right
    const isTransiting = state && state.isTransiting;
    const hasTransit = engine.cosIncFactor * (engine.a / engine.rStar) < (1 + engine.rPlanet / engine.rStar);

    let statusPillText = '● 궤도 정렬: 공전 주기마다 식현상 발생';
    let statusPillCol = '#00e5ff';
    let statusBorderCol = 'rgba(0, 229, 255, 0.4)';

    if (isTransiting) {
      statusPillText = '★ [식 진행 중!] 행성이 별빛을 차폐함';
      statusPillCol = '#00ffaa';
      statusBorderCol = 'rgba(0, 255, 170, 0.7)';
    } else if (!hasTransit) {
      statusPillText = '⚠ 궤도 경사각이 커서 별빛 통로를 비껴감';
      statusPillCol = '#ff3366';
      statusBorderCol = 'rgba(255, 51, 102, 0.6)';
    }

    ctx.font = 'bold 11.5px sans-serif';
    const badgeW = ctx.measureText(statusPillText).width + 20;
    const badgeH = 26;
    const badgeX = x + w - badgeW - 14;
    const badgeY = y + 10;

    ctx.fillStyle = 'rgba(12, 17, 34, 0.88)';
    ctx.strokeStyle = statusBorderCol;
    ctx.lineWidth = 1.2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
    }

    ctx.fillStyle = statusPillCol;
    ctx.fillText(statusPillText, badgeX + 10, badgeY + 17);

    ctx.restore();
  }

  renderBarycentricOrbit(ctx, x, y, width, height, engine, state) {
    ctx.save();

    // Section Header
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('🔭 [2] 행성계 공전 궤도 평면도 (Top-down Orbit View) : 공통 질량 중심 운동', x + 16, y + 24);

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const minDim = Math.min(width, height);

    const maxDistanceMeters = engine.rPlanetBary * (1 + engine.ecc);
    const scale = (minDim * 0.38) / maxDistanceMeters;

    this.drawLineOfSightIndicator(ctx, x, y, width, height, engine.inclinationDeg);

    // Draw Barycenter (+)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX, centerY + 8);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('질량 중심 (Barycenter)', centerX + 10, centerY - 10);
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.translate(centerX, centerY);

    // 1. Star Orbit Path (Yellow Dashed Circle)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    for (let p = 0; p <= 1.01; p += 0.01) {
      const st = engine.getStateAtPhase(p);
      const px = st.starPos.x * scale;
      const py = st.starPos.y * scale;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Planet Orbit Path (Cyan)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 1.5;
    for (let p = 0; p <= 1.01; p += 0.02) {
      const st = engine.getStateAtPhase(p);
      const px = st.planetPos.x * scale;
      const py = st.planetPos.y * scale;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const sX = state.starPos.x * scale;
    const sY = state.starPos.y * scale;
    const pX = state.planetPos.x * scale;
    const pY = state.planetPos.y * scale;

    // 3. Store and Draw Planet Trail
    this.trailHistory.push({ pX, pY });
    if (this.trailHistory.length > this.maxTrailLength) {
      this.trailHistory.shift();
    }

    for (let i = 0; i < this.trailHistory.length; i++) {
      const pt = this.trailHistory[i];
      const alpha = (i / this.trailHistory.length) * 0.4;
      ctx.beginPath();
      ctx.arc(pt.pX, pt.pY, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
      ctx.fill();
    }

    // Connecting line from Star to Planet passing through Barycenter (+)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.moveTo(sX, sY);
    ctx.lineTo(pX, pY);
    ctx.stroke();

    // 4. Render Star
    const starRadiusPx = Math.max(8, Math.min(22, 12 * Math.sqrt(engine.rStarSun)));

    const starGlow = ctx.createRadialGradient(sX, sY, 2, sX, sY, starRadiusPx * 2);
    starGlow.addColorStop(0, '#ffffff');
    starGlow.addColorStop(0.4, '#ffdd66');
    starGlow.addColorStop(1, 'rgba(255, 170, 0, 0)');

    ctx.fillStyle = starGlow;
    ctx.beginPath();
    ctx.arc(sX, sY, starRadiusPx * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff4cc';
    ctx.beginPath();
    ctx.arc(sX, sY, starRadiusPx, 0, Math.PI * 2);
    ctx.fill();

    // Star Velocity Vector Arrow
    const vrNorm = state.radialVelocity / (state.K || 1);
    ctx.beginPath();
    ctx.strokeStyle = vrNorm < 0 ? '#00e5ff' : '#ff3366';
    ctx.lineWidth = 3;
    ctx.moveTo(sX, sY);

    const arrowLen = -vrNorm * 35;
    ctx.lineTo(sX, sY + arrowLen);
    ctx.stroke();

    if (Math.abs(arrowLen) > 5) {
      ctx.fillStyle = vrNorm < 0 ? '#00e5ff' : '#ff3366';
      ctx.beginPath();
      const dir = Math.sign(arrowLen);
      ctx.moveTo(sX, sY + arrowLen);
      ctx.lineTo(sX - 5, sY + arrowLen - dir * 8);
      ctx.lineTo(sX + 5, sY + arrowLen - dir * 8);
      ctx.fill();
    }

    // 5. Render Planet
    const planetRadiusPx = Math.max(4, Math.min(14, 6 * Math.cbrt(engine.rPlanetJup)));
    const planetGlow = ctx.createRadialGradient(pX, pY, 1, pX, pY, planetRadiusPx * 1.8);
    planetGlow.addColorStop(0, '#00e5ff');
    planetGlow.addColorStop(1, 'rgba(0, 150, 255, 0)');

    ctx.fillStyle = planetGlow;
    ctx.beginPath();
    ctx.arc(pX, pY, planetRadiusPx * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#66f0ff';
    ctx.beginPath();
    ctx.arc(pX, pY, planetRadiusPx, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  /**
   * Observer Transit View (Screen 2)
   */
  renderTransitObserverView(ctx, x, y, width, height, engine, state) {
    ctx.save();

    // Section Header
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('🔭 [2] 관측자 망원경 천구 뷰 (Observer Transit Sky View) : 항성 원반 직접 관측', x + 16, y + 24);

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const minDim = Math.min(width, height);

    // 1. Base scale based on star physical radius
    const baseStarRadiusPx = minDim * 0.20;
    const baseStarRadius = Math.max(20, Math.min(minDim * 0.42, baseStarRadiusPx * Math.pow(engine.rStarSun, 0.65)));
    const baseScale = baseStarRadius / engine.rStar;

    // 2. Maximum projected extent of planet orbit in meters
    const maxOrbitDistMeters = engine.a * (1 + engine.ecc);
    const rawOrbitRadiusX_px = maxOrbitDistMeters * baseScale;
    const rawOrbitRadiusY_px = maxOrbitDistMeters * Math.max(0.15, engine.cosIncFactor) * baseScale;

    // 3. Margin boundaries: keep entire orbit inside canvas with padding
    const maxAllowedX = Math.max(60, (width / 2) - 45);
    const maxAllowedY = Math.max(50, (height / 2) - 35);

    // 4. Calculate auto-zoom:
    // When the orbit fits inside maxAllowed, autoZoom = 1.0 (star remains full size)
    // When the orbital radius gets larger and exceeds maxAllowed, autoZoom smoothly shrinks to keep the entire orbit in view!
    let autoZoom = 1.0;
    if (rawOrbitRadiusX_px > maxAllowedX || rawOrbitRadiusY_px > maxAllowedY) {
      const zoomX = maxAllowedX / rawOrbitRadiusX_px;
      const zoomY = maxAllowedY / rawOrbitRadiusY_px;
      autoZoom = Math.min(1.0, zoomX, zoomY);
    }

    // Apply user zoom (mouse wheel)
    const userZoom = this.transitUserZoom || 1.0;
    const totalZoom = Math.max(0.05, Math.min(5.0, autoZoom * userZoom));

    // Effective scale & star radius
    const scale = baseScale * totalZoom;
    const starRadiusPx = Math.max(12, baseStarRadius * totalZoom);

    // 1. Star Ambient Background Glow
    const starGlow = ctx.createRadialGradient(centerX, centerY, starRadiusPx * 0.2, centerX, centerY, starRadiusPx * 1.35);
    starGlow.addColorStop(0, '#ffffff');
    starGlow.addColorStop(0.5, '#ffbb33');
    starGlow.addColorStop(0.85, '#ff6600');
    starGlow.addColorStop(1, 'rgba(255, 102, 0, 0)');

    ctx.fillStyle = starGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, starRadiusPx * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Planet Orbit Line - Back Part (Behind Star Z, relZ < 0)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    let startedBack = false;
    for (let p = 0; p <= 1.01; p += 0.005) {
      const st = engine.getStateAtPhase(p);
      const relZ = st.planetPos.z - st.starPos.z;
      if (relZ < 0) {
        const px = centerX + (st.planetPos.x - st.starPos.x) * scale;
        const py = centerY + (st.planetPos.y - st.starPos.y) * scale;
        if (!startedBack) {
          ctx.moveTo(px, py);
          startedBack = true;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        startedBack = false;
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Star Disk with Limb Darkening
    const starDisk = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, starRadiusPx);
    starDisk.addColorStop(0, '#fff4cc');
    starDisk.addColorStop(0.7, '#ffa726');
    starDisk.addColorStop(1, '#e65100');

    ctx.fillStyle = starDisk;
    ctx.beginPath();
    ctx.arc(centerX, centerY, starRadiusPx, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw Planet Orbit Line - Front Part (In Front of Star Z, relZ >= 0)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
    ctx.shadowColor = 'rgba(0, 229, 255, 0.7)';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let startedFront = false;
    for (let p = 0; p <= 1.01; p += 0.005) {
      const st = engine.getStateAtPhase(p);
      const relZ = st.planetPos.z - st.starPos.z;
      if (relZ >= 0) {
        const px = centerX + (st.planetPos.x - st.starPos.x) * scale;
        const py = centerY + (st.planetPos.y - st.starPos.y) * scale;
        if (!startedFront) {
          ctx.moveTo(px, py);
          startedFront = true;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        startedFront = false;
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. Current Planet Position & Geometric Occultation Logic
    const relX = (state.planetPos.x - state.starPos.x) * scale;
    const relY = (state.planetPos.y - state.starPos.y) * scale;
    const planetX = centerX + relX;
    const planetY = centerY + relY;
    const projDistPx = Math.sqrt(relX * relX + relY * relY);

    const isPlanetInFront = state.planetPos.z > state.starPos.z;
    const planetRadiusPx = Math.max(3.5, Math.min(starRadiusPx * 0.5, engine.rPlanet * scale));

    const isOccultedBehindStarDisk = (!isPlanetInFront) && (projDistPx < starRadiusPx + planetRadiusPx);

    if (isPlanetInFront) {
      ctx.fillStyle = '#0a0d1a';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(planetX, planetY, planetRadiusPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (state.isTransiting) {
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.9)';
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    } else {
      if (isOccultedBehindStarDisk) {
        ctx.fillStyle = 'rgba(255, 51, 102, 0.4)';
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(planetX, planetY, planetRadiusPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff3366';
        ctx.font = 'bold 12.5px sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText('(항성에 가려짐 - 2차 식)', planetX + 12, planetY + 4);
        ctx.shadowBlur = 0;
      } else {
        const planetGlow = ctx.createRadialGradient(planetX, planetY, 1, planetX, planetY, planetRadiusPx * 1.5);
        planetGlow.addColorStop(0, '#00e5ff');
        planetGlow.addColorStop(1, 'rgba(0, 150, 255, 0)');

        ctx.fillStyle = planetGlow;
        ctx.beginPath();
        ctx.arc(planetX, planetY, planetRadiusPx * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#66f0ff';
        ctx.beginPath();
        ctx.arc(planetX, planetY, planetRadiusPx, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 229, 255, 0.95)';
        ctx.font = 'bold 12.5px sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText('(보임 - 가려지지 않음)', planetX + 12, planetY + 4);
        ctx.shadowBlur = 0;
      }
    }

    // 6. Zoom Status Badge in Top-Right
    ctx.save();
    const isAutoZoomed = autoZoom < 0.98;
    const isUserZoomed = Math.abs(userZoom - 1.0) > 0.03;
    let zoomText = `🔍 줌: ${(totalZoom * 100).toFixed(0)}%`;
    if (isAutoZoomed && !isUserZoomed) {
      zoomText = `🔍 궤도 전체 맞춤 (${(totalZoom * 100).toFixed(0)}%)`;
    } else if (isUserZoomed) {
      zoomText = `🔍 사용자 줌: ${(totalZoom * 100).toFixed(0)}% (더블클릭 초기화)`;
    }

    ctx.font = 'bold 12.5px sans-serif';
    const textMetrics = ctx.measureText(zoomText);
    const badgeW = textMetrics.width + 20;
    const badgeH = 26;
    const badgeX = x + width - badgeW - 14;
    const badgeY = y + 10;

    ctx.fillStyle = 'rgba(12, 17, 34, 0.82)';
    ctx.strokeStyle = isAutoZoomed || isUserZoomed ? 'rgba(0, 229, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isAutoZoomed || isUserZoomed ? '#00e5ff' : '#cbd5e1';
    ctx.fillText(zoomText, badgeX + 10, badgeY + 17);
    ctx.restore();

    ctx.restore();
  }

  drawLineOfSightIndicator(ctx, x, y, width, height, incDeg) {
    ctx.save();
    const arrowX = x + 30;
    const arrowY = y + height - 36;

    ctx.strokeStyle = '#00e5ff';
    ctx.fillStyle = '#00e5ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX, arrowY - 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY - 26);
    ctx.lineTo(arrowX - 5, arrowY - 18);
    ctx.lineTo(arrowX + 5, arrowY - 18);
    ctx.fill();

    ctx.font = 'bold 12.5px sans-serif';
    ctx.fillText('관측자 시선 방향 (Earth)', arrowX + 12, arrowY - 12);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const statusStr = incDeg === 0 ? ' (평행: 최대 시선속도)' : (incDeg === 90 ? ' (수직: 시선속도 0)' : '');
    ctx.fillText(`궤도 경사각 = ${incDeg.toFixed(1)}°${statusStr}`, arrowX + 12, arrowY + 3);
    ctx.restore();
  }

  renderDopplerSpectrum(ctx, width, height, state) {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#090c15';
    ctx.fillRect(0, 0, width, height);

    const marginX = 12;
    const barHeight = Math.floor(height * 0.34);
    const bar1Y = 22;
    const bar2Y = bar1Y + barHeight + 25;
    const barWidth = width - marginX * 2;

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 12.5px sans-serif';
    ctx.fillText('기준 스펙트럼 (정지 상태)', marginX, bar1Y - 6);
    ctx.fillText('관측 스펙트럼 (실시간 도플러 이동)', marginX, bar2Y - 6);

    const rainbow1 = ctx.createLinearGradient(marginX, 0, marginX + barWidth, 0);
    const rainbowColors = [
      '#7b1fa2', '#303f9f', '#1976d2', '#0288d1',
      '#0097a7', '#00796b', '#388e3c', '#689f38',
      '#afb42b', '#fbc02d', '#ffa000', '#f57c00', '#d32f2f'
    ];
    rainbowColors.forEach((col, idx) => {
      rainbow1.addColorStop(idx / (rainbowColors.length - 1), col);
    });

    ctx.fillStyle = rainbow1;
    ctx.fillRect(marginX, bar1Y, barWidth, barHeight);

    ctx.fillStyle = rainbow1;
    ctx.fillRect(marginX, bar2Y, barWidth, barHeight);

    const restLinePositions = [0.15, 0.28, 0.42, 0.58, 0.73, 0.86];

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    restLinePositions.forEach(pos => {
      const x = marginX + pos * barWidth;
      ctx.beginPath();
      ctx.moveTo(x, bar1Y);
      ctx.lineTo(x, bar1Y + barHeight);
      ctx.stroke();
    });

    let v_r = state ? state.radialVelocity : 0;
    let K = state ? state.K : 0;

    // 부동소수점 오차 방지 (경사각 90도 또는 속도 0 부근)
    if (Math.abs(v_r) < 0.005) v_r = 0;
    if (Math.abs(K) < 0.005) K = 0;

    // 최대 가용 편이 픽셀 (스펙트럼 바 폭의 8%)
    const maxVisualShiftPx = barWidth * 0.08; 

    // 시선속도 v_r 및 최대값 K의 크기에 비례하여 스펙트럼 선의 편이량(shiftPx) 계산:
    // 1) 시선속도 최대값 K에 따라 최대 편이 진폭(amplitudePx) 결정 (K가 클수록 큰 편이, K=0이면 0)
    // 2) 순간 편이량은 (v_r / K)의 비율에 정비례하여 청색편이/적색편이 전 구간에서 포화 없이 연속적이고 서서히 변화
    // 3) v_r = 0 (경사각 90도 또는 시선속도 0 지점) -> shiftPx = 0 (스펙트럼 선 변이 없음, 정지)
    const kScale = 80.0; // 기준 시선속도 스케일 (m/s)
    const amplitudePx = Math.tanh(K / kScale) * maxVisualShiftPx;
    const shiftPx = K > 0 ? (v_r / K) * amplitudePx : 0;

    const vrColor = v_r < -0.1 ? '#00e5ff' : (v_r > 0.1 ? '#ff3366' : '#ffffff');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;

    restLinePositions.forEach(pos => {
      const origX = marginX + pos * barWidth;
      const shiftedX = Math.max(marginX, Math.min(marginX + barWidth, origX + shiftPx));

      ctx.beginPath();
      ctx.moveTo(shiftedX, bar2Y);
      ctx.lineTo(shiftedX, bar2Y + barHeight);
      ctx.stroke();

      if (Math.abs(shiftPx) > 0.5) {
        ctx.save();
        ctx.strokeStyle = vrColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(origX, bar1Y + barHeight);
        ctx.lineTo(shiftedX, bar2Y);
        ctx.stroke();
        ctx.restore();
      }
    });

    const absVr = Math.abs(v_r).toFixed(1);
    let shiftText = `시선속도: ${v_r >= 0 ? '+' : ''}${absVr} m/s`;
    let typeText = '변화 없음 (시선속도 0)';
    if (v_r < -0.1) typeText = '청색 편이 (Blueshift - 다가옴)';
    else if (v_r > 0.1) typeText = '적색 편이 (Redshift - 멀어짐)';

    ctx.fillStyle = vrColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${shiftText}  |  ${typeText}`, marginX + 6, height - 7);

    ctx.restore();
  }
}

window.OrbitViewRenderer = OrbitViewRenderer;
