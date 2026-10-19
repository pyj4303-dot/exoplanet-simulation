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

    if (this.viewMode === 'orbit') {
      this.renderBarycentricOrbit(ctx, width, height, engine, state);
    } else {
      this.renderTransitObserverView(ctx, width, height, engine, state);
    }

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

  renderBarycentricOrbit(ctx, width, height, engine, state) {
    const centerX = width / 2;
    const centerY = height / 2;
    const minDim = Math.min(width, height);

    const maxDistanceMeters = engine.rPlanetBary * (1 + engine.ecc);
    const scale = (minDim * 0.38) / maxDistanceMeters;

    this.drawLineOfSightIndicator(ctx, width, height, engine.inclinationDeg);

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
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('질량 중심 (Barycenter)', centerX + 10, centerY - 10);

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
  }

  /**
   * Observer Transit View (Screen 2)
   */
  renderTransitObserverView(ctx, width, height, engine, state) {
    const centerX = width / 2;
    const centerY = height / 2;
    const minDim = Math.min(width, height);

    const baseStarRadiusPx = minDim * 0.20;
    const starRadiusPx = Math.max(20, Math.min(minDim * 0.42, baseStarRadiusPx * Math.pow(engine.rStarSun, 0.65)));
    const scale = starRadiusPx / engine.rStar;

    // 1. Star Ambient Background Glow
    const starGlow = ctx.createRadialGradient(centerX, centerY, starRadiusPx * 0.2, centerX, centerY, starRadiusPx * 1.3);
    starGlow.addColorStop(0, '#ffffff');
    starGlow.addColorStop(0.5, '#ffbb33');
    starGlow.addColorStop(0.85, '#ff6600');
    starGlow.addColorStop(1, 'rgba(255, 102, 0, 0)');

    ctx.fillStyle = starGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, starRadiusPx * 1.3, 0, Math.PI * 2);
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

    // 5. Impact Parameter Guide Line
    const impactDistPx = (engine.a * engine.cosIncFactor) * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(centerX - starRadiusPx * 1.8, centerY + impactDistPx);
    ctx.lineTo(centerX + starRadiusPx * 1.8, centerY + impactDistPx);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px sans-serif';
    const impactVal = ((engine.a / engine.rStar) * engine.cosIncFactor).toFixed(2);
    ctx.fillText(`임팩트 파라미터 b = ${impactVal}`, 
                 centerX - starRadiusPx * 1.7, centerY + impactDistPx - 6);

    // 6. Current Planet Position & Geometric Occultation Logic
    const relX = (state.planetPos.x - state.starPos.x) * scale;
    const relY = (state.planetPos.y - state.starPos.y) * scale;
    const planetX = centerX + relX;
    const planetY = centerY + relY;
    const projDistPx = Math.sqrt(relX * relX + relY * relY);

    const isPlanetInFront = state.planetPos.z > state.starPos.z;
    const planetRadiusPx = Math.max(3, engine.rPlanet * scale);

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
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('(항성에 가려짐 - 2차 식)', planetX + 12, planetY + 4);
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

        ctx.fillStyle = 'rgba(0, 229, 255, 0.85)';
        ctx.font = '11px sans-serif';
        ctx.fillText('(보임 - 가려지지 않음)', planetX + 12, planetY + 4);
      }
    }
  }

  drawLineOfSightIndicator(ctx, width, height, incDeg) {
    ctx.save();
    const arrowX = 35;
    const arrowY = height - 45;

    ctx.strokeStyle = '#00e5ff';
    ctx.fillStyle = '#00e5ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX, arrowY - 30);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY - 30);
    ctx.lineTo(arrowX - 5, arrowY - 22);
    ctx.lineTo(arrowX + 5, arrowY - 22);
    ctx.fill();

    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('관측자 시선 방향 (Earth)', arrowX + 12, arrowY - 12);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const statusStr = incDeg === 0 ? ' (평행: 최대 시선속도 & 식현상)' : (incDeg === 90 ? ' (수직: 시선속도 0)' : '');
    ctx.fillText(`궤도 경사각 = ${incDeg.toFixed(1)}°${statusStr}`, arrowX + 12, arrowY + 3);
    ctx.restore();
  }

  renderDopplerSpectrum(ctx, width, height, state) {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#090c15';
    ctx.fillRect(0, 0, width, height);

    const marginX = 10;
    const barHeight = height * 0.38;
    const bar1Y = 18;
    const bar2Y = bar1Y + barHeight + 22;
    const barWidth = width - marginX * 2;

    ctx.fillStyle = '#a0aec0';
    ctx.font = '10px sans-serif';
    ctx.fillText('기준 스펙트럼 (정지 상태)', marginX, bar1Y - 4);
    ctx.fillText('관측 스펙트럼 (실시간 도플러 이동)', marginX, bar2Y - 4);

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
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${shiftText}  |  ${typeText}`, marginX + 5, height - 5);

    ctx.restore();
  }
}

window.OrbitViewRenderer = OrbitViewRenderer;
