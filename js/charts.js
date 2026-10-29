/**
 * Real-time High-Performance Canvas Chart Engine for Exoplanet Curves
 * 
 * Synchronized with Physics Engine.
 * Features 100% Perfect Alignment for Radial Velocity Curve Cursor:
 * When star radial velocity is 0 (at top & bottom of 2D orbit),
 * the graph cursor dot is EXACTLY at 0 m/s on the center axis.
 */

class ChartRenderer {
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

  /**
   * Adaptive Round Y-Scale (m/s)
   */
  getNiceYScale(K) {
    const absK = Math.abs(K);
    if (absK <= 5) return 10;
    if (absK <= 15) return 20;
    if (absK <= 35) return 50;
    if (absK <= 75) return 100;
    if (absK <= 150) return 200;
    if (absK <= 350) return 500;
    if (absK <= 750) return 1000;
    return Math.ceil((absK * 1.25) / 100) * 100;
  }

  /**
   * Render Radial Velocity Graph (100% Aligned with 2D Orbit View)
   */
  renderRadialVelocity(rvData, currentPhase, K, periodDays, timeSpanDays) {
    if (!this.canvas || !this.ctx || !rvData || !rvData.length) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const padLeft = 70;
    const padRight = 25;
    const padTop = 35;
    const padBottom = 48;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;
    const centerY = padTop + plotH / 2;

    const maxYScale = this.getNiceYScale(K);

    // Grid lines & X-Axis in Days
    this.drawGridInDays(ctx, padLeft, padTop, plotW, plotH, centerY, maxYScale, '시선속도 v_r (m/s)', timeSpanDays);

    // Draw Period P vertical dashed line at t = periodDays
    const pX = padLeft + (periodDays / timeSpanDays) * plotW;
    if (pX >= padLeft && pX <= padLeft + plotW) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pX, padTop);
      ctx.lineTo(pX, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = 'bold 13px sans-serif';
      const pText = periodDays >= 100 ? `주기 P = ${periodDays.toFixed(0)}일` : `주기 P = ${periodDays.toFixed(1)}일`;
      const pTextW = ctx.measureText(pText).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(Math.min(pX + 4, w - pTextW - 14), padTop + 4, pTextW + 8, 20);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(pText, Math.min(pX + 8, w - pTextW - 10), padTop + 18);
    }

    // Draw Main RV Curve directly from physics rvData
    ctx.beginPath();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';
    ctx.shadowBlur = 8;

    rvData.forEach((pt, i) => {
      const x = padLeft + (pt.timeDays / timeSpanDays) * plotW;
      const normY = Math.max(-1.1, Math.min(1.1, pt.v_r / maxYScale));
      const y = centerY - normY * (plotH / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current Time Indicator line & dot (100% Synchronized with 2D Orbit View)
    // Orbital time in Days is currentPhase * periodDays
    const currentTimeDays = currentPhase * periodDays;
    const currentX = padLeft + (currentTimeDays / timeSpanDays) * plotW;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(currentX, padTop);
    ctx.lineTo(currentX, padTop + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    const dataLen = rvData.length;
    const currentIdx = Math.min(dataLen - 1, Math.max(0, Math.floor((currentTimeDays / timeSpanDays) * dataLen)));
    const currentPt = rvData[currentIdx] || rvData[0];
    const normY = Math.max(-1.0, Math.min(1.0, currentPt.v_r / maxYScale));
    const currentY = centerY - normY * (plotH / 2);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value Tooltip on Chart (Prominent Badge)
    ctx.font = 'bold 13.5px sans-serif';
    const dayStr = currentPt.timeDays >= 100 ? currentPt.timeDays.toFixed(0) : currentPt.timeDays.toFixed(1);
    const vrValText = `t: ${dayStr}일 | v_r: ${currentPt.v_r.toFixed(2)} m/s`;
    const tipMetrics = ctx.measureText(vrValText);
    const tipW = tipMetrics.width + 18;
    const tipH = 26;
    const tipX = Math.min(Math.max(currentX + 10, padLeft + 8), w - tipW - 10);
    const tipY = Math.max(padTop + 24, Math.min(padTop + plotH - tipH, currentY - 14));

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(tipX, tipY - 18, tipW, tipH, 6);
    else ctx.rect(tipX, tipY - 18, tipW, tipH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(vrValText, tipX + 9, tipY);

    // Peak Amplitude K label line
    const kNorm = Math.max(-1.0, Math.min(1.0, K / maxYScale));
    const kY = centerY - kNorm * (plotH / 2);
    ctx.strokeStyle = 'rgba(255, 51, 102, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, kY);
    ctx.lineTo(padLeft + plotW, kY);
    ctx.stroke();

    ctx.font = 'bold 13.5px sans-serif';
    const kText = `진폭 K = ${K.toFixed(2)} m/s`;
    const kW = ctx.measureText(kText).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(padLeft + 8, Math.max(padTop + 4, kY - 21), kW + 10, 20);
    ctx.fillStyle = '#ff3366';
    ctx.fillText(kText, padLeft + 12, Math.max(padTop + 18, kY - 6));

    ctx.restore();
  }

  /**
   * Render Transit Light Curve Graph (Screen 2)
   */
  renderLightCurve(lightCurveData, tProgressDays, maxDepthPercent, hasTransit, periodDays, startDays, endDays) {
    if (!this.canvas || !this.ctx || !lightCurveData || !lightCurveData.length) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const padLeft = 70;
    const padRight = 25;
    const padTop = 35;
    const padBottom = 48;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const start = (typeof endDays === 'number') ? startDays : 0;
    const end = (typeof endDays === 'number') ? endDays : startDays;
    const windowSpanDays = Math.max(0.001, end - start);

    const minFluxNeeded = lightCurveData.reduce((min, pt) => Math.min(min, pt.flux), 1.0);
    const minFluxScale = Math.min(0.985, minFluxNeeded - 0.003);
    const maxFluxScale = 1.002;

    const getFluxY = (flux) => {
      const norm = (flux - minFluxScale) / (maxFluxScale - minFluxScale);
      const clampedNorm = Math.max(-0.1, Math.min(1.1, norm));
      return padTop + plotH * (1 - clampedNorm);
    };

    // Draw Light Curve Grid with Days
    this.drawLightCurveGridInDays(ctx, padLeft, padTop, plotW, plotH, minFluxScale, maxFluxScale, start, end);

    // Draw Period P vertical lines for all n*P within [start, end]
    const minN = Math.max(1, Math.ceil((start - 0.001) / periodDays));
    const maxN = Math.floor((end + 0.001) / periodDays);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);

    for (let n = minN; n <= maxN; n++) {
      const tP = n * periodDays;
      const pX = padLeft + ((tP - start) / windowSpanDays) * plotW;
      if (pX >= padLeft && pX <= padLeft + plotW) {
        ctx.beginPath();
        ctx.moveTo(pX, padTop);
        ctx.lineTo(pX, padTop + plotH);
        ctx.stroke();

        ctx.font = 'bold 13px sans-serif';
        const pText = `${n}주기 (${n}P)`;
        const pTextW = ctx.measureText(pText).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(Math.min(pX + 4, w - pTextW - 14), padTop + 4, pTextW + 8, 20);
        ctx.fillStyle = '#ffd700';
        ctx.fillText(pText, Math.min(pX + 8, w - pTextW - 10), padTop + 18);
      }
    }
    ctx.setLineDash([]);

    // Draw Main Light Curve
    ctx.beginPath();
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 255, 170, 0.5)';
    ctx.shadowBlur = 8;

    lightCurveData.forEach((pt, i) => {
      const x = padLeft + ((pt.timeDays - start) / windowSpanDays) * plotW;
      const y = getFluxY(pt.flux);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current Time Indicator Line & White Dot
    const currentNorm = (tProgressDays - start) / windowSpanDays;
    const currentX = padLeft + Math.max(0, Math.min(1, currentNorm)) * plotW;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(currentX, padTop);
    ctx.lineTo(currentX, padTop + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    const dataLen = lightCurveData.length;
    const currentIdx = Math.min(dataLen - 1, Math.max(0, Math.round(currentNorm * (dataLen - 1))));
    const currentPt = lightCurveData[currentIdx] || lightCurveData[0];
    const currentY = getFluxY(currentPt.flux);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Value Tooltip on Chart (Prominent Badge)
    ctx.font = 'bold 13.5px sans-serif';
    const dayStr = tProgressDays >= 100 ? tProgressDays.toFixed(0) : tProgressDays.toFixed(1);
    const fluxPctStr = (currentPt.flux * 100).toFixed(3);
    const fluxValText = `t: ${dayStr}일 | 광도: ${fluxPctStr}%`;
    const tipMetrics = ctx.measureText(fluxValText);
    const tipW = tipMetrics.width + 18;
    const tipH = 26;
    const tipX = Math.min(Math.max(currentX + 10, padLeft + 8), w - tipW - 10);
    const tipY = Math.max(padTop + 24, Math.min(padTop + plotH - tipH, currentY - 14));

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(tipX, tipY - 18, tipW, tipH, 6);
    else ctx.rect(tipX, tipY - 18, tipW, tipH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(fluxValText, tipX + 9, tipY);

    // Annotations & Transit Status
    if (!hasTransit) {
      // Prominent Centered Alert Banner for Students
      ctx.save();
      const cardW = Math.min(plotW - 30, 520);
      const cardH = 92;
      const cardX = padLeft + (plotW - cardW) / 2;
      const cardY = padTop + (plotH - cardH) / 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = 'rgba(255, 51, 102, 0.85)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 51, 102, 0.45)';
      ctx.shadowBlur = 16;

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      else ctx.rect(cardX, cardY, cardW, cardH);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff3366';
      ctx.font = 'bold 17.5px sans-serif';
      ctx.fillText('⚠ 궤도 경사각이 낮아 식현상이 발생하지 않음', cardX + cardW / 2, cardY + 34);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '500 13px sans-serif';
      ctx.fillText('공전 궤도면이 시선 방향에서 벗어나 행성이 항성 앞을 가리지 않습니다.', cardX + cardW / 2, cardY + 57);

      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('💡 오른쪽 슬라이더에서 궤도 경사각(θ)을 0.0°(평행)에 가깝게 조절해보세요!', cardX + cardW / 2, cardY + 77);

      ctx.restore();
    } else {
      ctx.save();
      ctx.font = 'bold 13.5px sans-serif';
      const depthText = `식 깊이 (Transit Depth ΔF): ${maxDepthPercent}%`;
      const depthMetrics = ctx.measureText(depthText);
      const badgeW = depthMetrics.width + 20;
      const badgeH = 26;
      const badgeX = padLeft + 12;
      const badgeY = padTop + 8;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      else ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00ffaa';
      ctx.fillText(depthText, badgeX + 10, badgeY + 18);
      ctx.restore();
    }

    ctx.restore();
  }

  drawGridInDays(ctx, x, y, w, h, centerY, maxYScale, yLabelText, timeSpanDays) {
    ctx.fillStyle = 'rgba(12, 17, 34, 0.7)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal Y-Axis Grid Lines (+Max, +Max/2, 0, -Max/2, -Max)
    const yValues = [maxYScale, maxYScale / 2, 0, -maxYScale / 2, -maxYScale];
    yValues.forEach((val, idx) => {
      const gridY = y + (h / (yValues.length - 1)) * idx;
      ctx.beginPath();
      ctx.moveTo(x, gridY);
      ctx.lineTo(x + w, gridY);
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 12.5px sans-serif';
      ctx.textAlign = 'right';
      const labelText = val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0);
      ctx.fillText(labelText, x - 10, gridY + 4);
      ctx.restore();
    });

    // Zero-velocity Highlight Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x + w, centerY);
    ctx.stroke();

    // Vertical X-Axis Grid Lines in Days (4 intervals)
    const numXSteps = 4;
    for (let i = 0; i <= numXSteps; i++) {
      const gridX = x + (w / numXSteps) * i;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(gridX, y);
      ctx.lineTo(gridX, y + h);
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 12.5px sans-serif';
      ctx.textAlign = 'center';
      const dayVal = (timeSpanDays / numXSteps) * i;
      const dayStr = dayVal >= 100 ? `${dayVal.toFixed(0)}일` : `${dayVal.toFixed(1)}일`;
      ctx.fillText(dayStr, gridX, y + h + 20);
      ctx.restore();
    }

    // Y Axis Title (Centered vertically on axis)
    ctx.save();
    ctx.translate(x - 48, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(yLabelText, 0, 0);
    ctx.restore();

    // X Axis Title (Centered horizontally)
    ctx.save();
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('시간 (일 / Days)', x + w / 2, y + h + 38);
    ctx.restore();
  }

  drawLightCurveGridInDays(ctx, x, y, w, h, minFlux, maxFlux, startDays, endDays) {
    ctx.fillStyle = 'rgba(12, 17, 34, 0.7)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const gridY = y + (h / steps) * i;
      ctx.beginPath();
      ctx.moveTo(x, gridY);
      ctx.lineTo(x + w, gridY);
      ctx.stroke();

      ctx.save();
      const fluxVal = maxFlux - ((maxFlux - minFlux) / steps) * i;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 12.5px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(fluxVal.toFixed(4), x - 10, gridY + 4);
      ctx.restore();
    }

    const norm1 = (1.0 - minFlux) / (maxFlux - minFlux);
    const y1 = y + h * (1 - norm1);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x + w, y1);
    ctx.stroke();

    const start = (typeof endDays === 'number') ? startDays : 0;
    const end = (typeof endDays === 'number') ? endDays : startDays;
    const spanDays = end - start;

    const numXSteps = 4;
    for (let i = 0; i <= numXSteps; i++) {
      const gridX = x + (w / numXSteps) * i;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 12.5px sans-serif';
      ctx.textAlign = 'center';
      const dayVal = start + (spanDays / numXSteps) * i;
      const dayStr = dayVal >= 100 ? `${dayVal.toFixed(0)}일` : `${dayVal.toFixed(1)}일`;
      ctx.fillText(dayStr, gridX, y + h + 20);
      ctx.restore();
    }

    // Y Axis Title (Centered vertically on axis)
    ctx.save();
    ctx.translate(x - 50, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('상대 광도 (Relative Flux)', 0, 0);
    ctx.restore();

    // X Axis Title (Centered horizontally)
    ctx.save();
    ctx.fillStyle = '#00ffaa';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('시간 (일 / Days)', x + w / 2, y + h + 38);
    ctx.restore();
  }
}

window.ChartRenderer = ChartRenderer;
