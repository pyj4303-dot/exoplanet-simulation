# 🪐 외계 행성계 탐사 시뮬레이션 (Exoplanet Exploration Simulator)

> **한국 지구과학 I·II 교육과정**에 완벽하게 부합하는 인터랙티브 외계 행성 탐사 시뮬레이터입니다.  
> 케플러 제3법칙, 도플러 효과(시선속도법), 식현상(광도곡선), 미세중력렌즈 효과의 물리 법칙을 실시간 고성능 Canvas 렌더링으로 학습하고 탐구할 수 있습니다.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## 🌟 주요 탐사 기능

### 1. 🔭 시선속도법 (Radial Velocity Method / 도플러 효과)
- **공통 질량 중심(Barycenter) 계**: 행성의 인력으로 항성이 미세하게 흔들리는 2차원 궤도 운동 시각화.
- **실시간 도플러 분광 스펙트럼**: 항성이 관측자에게 다가올 때 **청색편이(Blueshift, #00e5ff)**, 멀어질 때 **적색편이(Redshift, #ff3366)**를 실시간 흡수선 이동으로 표현.
- **시선속도 변화 곡선 ($v_r$ - 시간(일/Days) 그래프)**: 
  - 항성이 궤도 최상단/최하단에 위치할 때 시선속도가 정확히 **$0\text{ m/s}$** 중앙 기준선을 통과하도록 정밀 동기화.
  - 가로축을 일(Days) 단위로 자동 조정하여 주기($P$)와 진폭($K$)의 변화를 명확히 관찰 가능.
- **물리 조건 조절**: 행성 질량($m_p$), 항성 질량($M_s$), 시선방향 궤도각($\theta$), 궤도 반지름($a$), 이심률($e$).

---

### 2. 🌕 식현상 (Transit Method / 광도 변화 곡선)
- **관측자 시점 천구 뷰**: 행성이 항성 앞면을 가로지르는 모습(Primary Transit)과 항성 뒤로 숨는 모습(Secondary Eclipse)을 3D 시선 투영으로 렌더링.
- **광도 변화 곡선 (Relative Flux - 시간(일/Days) 그래프)**:
  - 행성이 항성 **앞을 가릴 때만** 광도가 떨어지며, 항성 **뒤로 갈 때는 $1.0000(100\%)$ 기준선이 일정하게 유지**.
  - 멈춤 없는 연속 타임라인 커서 이동과 함께 **어떠한 조건에서도 2회 이상의 식현상 딥(Dip)이 항상 선명하게 표시**.
- **정밀 조절 슬라이더**: 행성 반지름($R_p$), 항성 반지름($R_s$), 궤도 반지름($a$, $0.001\text{ AU}$ 초정밀 단위), 행성 질량($m_p$), 항성 질량($M_s$), 경사각($\theta$).

---

### 3. 🔍 미세중력렌즈 (Gravitational Microlensing Method)
- **상하 2단 듀얼 뷰(Dual View)**:
  1. **상단 [시선 방향 관측 기하도]**: **[관측자 (지구 🌍)]** $\leftarrow$ **[전경 렌즈계 (별+행성 🪐)]** $\leftarrow$ **[배경별 (먼 별 🌟)]**의 공간 배치와 빛이 시공간 곡면을 따라 휘어져 관측자에게 모여드는 **광선 굴절(Ray Tracing) 애니메이션**.
  2. **하단 [망원경 천구 관측 뷰]**: 아인슈타인 반경($\theta_E$) 링과 2개의 왜곡된 호(Arc) 상, 배경별 광채의 실시간 팽창.
- **실시간 광도 증폭 곡선 (Magnification Light Curve)**:
  - 렌즈별에 의한 매끄러운 대칭형 종 모양 곡선(Paczynski Curve, 주황 점선).
  - 외계 행성에 의해 날카롭고 확실하게 솟아오르는 **미세 피크(Planet Anomaly Peak, 네온 실선)**.
- **물리 조건 조절**: 외계 행성 질량($0.1 \sim 20.0\text{ }M_{\text{Jup}}$), 렌즈 별 질량, 최소 접근 거리($u_0$), 분리 거리($s$), 위치각($\phi$), 교차 시간($t_E$).

---

## 🚀 빠른 시작 (로컬 실행)

이 프로젝트는 순수 웹 표준(Vanilla HTML5, CSS3, JavaScript)으로 제작되어 별도의 라이브러리 설치나 빌드 과정 없이 바로 실행할 수 있습니다.

1. 저장소를 클론(또는 다운로드)합니다:
   ```bash
   git clone https://github.com/<your-username>/exoplanet-simulation.git
   cd exoplanet-simulation
   ```

2. 브라우저에서 `index.html`을 더블 클릭하여 열거나, PowerShell 로컬 서버를 실행합니다:
   ```powershell
   powershell -ExecutionPolicy Bypass -File server.ps1
   ```
   이후 브라우저에서 `http://localhost:8080`으로 접속합니다.

---

## 🌐 GitHub Pages로 무료 웹 사이트 배포하기

이 저장소를 깃허브에 올린 후 **GitHub Pages** 기능을 활성화하면, 전 세계 누구나 웹 브라우저에서 링크 하나로 즉시 접속할 수 있습니다.

1. GitHub 저장소 상단 메뉴의 **Settings**로 이동합니다.
2. 좌측 사이드바에서 **Pages**를 클릭합니다.
3. **Build and deployment > Branch** 항목에서:
   - Branch를 `main` (또는 `master`), 폴더를 `/ (root)`로 선택하고 **Save**를 누릅니다.
4. 약 1분 후 상단에 생성되는 **`https://<username>.github.io/<repository-name>/`** 주소로 접속하시면 웹에서 바로 실행됩니다!

---

## 📁 프로젝트 구조

```
exoplanet-simulation/
├── index.html            # 메인 대시보드 UI (헤더, 탭, 캔버스, 슬라이더)
├── styles.css            # 반응형 다크 네온 글래스모피즘 스타일시트
├── server.ps1            # 로컬 테스트용 경량 PowerShell HTTP 서버
├── README.md             # 프로젝트 안내 문서
├── .gitignore            # Git 제외 파일 목록
└── js/
    ├── physics.js        # 케플러 궤도 계산, 도플러 시선속도, 식현상 광도 계산 엔진
    ├── presets.js        # 실제 외계 행성계 프리셋 데이터 (51 Peg b, Kepler-186f 등)
    ├── orbitView.js      # 2D 공통 질량 중심 궤도, 도플러 스펙트럼 바, 식현상 천구 뷰 렌더러
    ├── charts.js         # 고성능 Canvas 기반 실시간 시선속도 및 식현상 차트 엔진
    ├── microlensing.js   # 미세중력렌즈 물리 계산, 관측자 광선도, 증폭 곡선 렌더러
    └── app.js            # 전체 인터랙션 및 애니메이션 루프 통합 오케스트레이터
```

---

## 📜 라이선스 (License)

This project is licensed under the MIT License.
자유롭게 수정, 배포 및 교육 목적으로 활용하실 수 있습니다.
