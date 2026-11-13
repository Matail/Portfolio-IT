/* logistics-data.js
 * Project data for the FAF5 freight-cost prediction page (projects/logistics.html).
 * Every value below was copied or directly computed from files in three repos:
 *   AI  = NOMADATASCIENCE/nomad-AI        (main @ f497cce, 2026-05-23)
 *   BE  = NOMADATASCIENCE/nomad-backend   (main @ f2e96a8, 2026-06-01)
 *   FE  = NOMADATASCIENCE/FAF5_Features   (main @ bd10738, develop @ b21d921, 2026-06-01)
 * Each block names its source file. Nothing is rounded except where noted.
 * Keys with no data in any repo are left out. meta.missing explains why.
 */
window.LOGI_DATA = {
  meta: {
    extracted: "2026-11-13",
    target: "next_cost_proxy (next-year cost_proxy). Models fit ln(target); predictions are exp() back-transformed.",
    costProxyDef: "FE main components/cost-drivers/cost-drivers.js tooltip: 'FAF5 v2 cost proxy index - 디젤·물동량·거리 결합 운임 부담 지표'. AI README: 'cost_proxy = 운송비용 상대적 크기'. The formula is not in any repo.",
    missing: {
      errorBreakdown: "No per-SCTG-group / dist_band / padd_orig error numbers in any repo or git history. fa-rmse.webp has no source data in the repos.",
      within20: "No +/-20% metric is computed anywhere. Scripts compute only the +/-10% share (rel_err <= 0.10).",
      vifValues: "analysis/vif.R prints car::vif() but no output is committed. No threshold is coded.",
      spread: "The processed dataset (data/processed/*.csv) is gitignored and not in the repos, so the cost_proxy distribution per distance band cannot be computed.",
      aggregatedRowCount: "The row count after aggregation to year x OD x commodity x distance is not recorded (vif.R prints nobs(fit), but no output is committed).",
      optunaTrialLogs: "Only n_trials settings and the BEST_PARAMS hardcoded in model/*.py exist. Trial histories and best scores are not saved."
    }
  },

  /* 1. ACCURACY ------------------------------------------------------------ */
  accuracy: {
    source: "FE develop components/feature-importance/feature-importance.js MODEL_DATA[*].metrics (added in 1a7fb09, 2026-05-23)",
    definitions: {
      rmseLog: "RMSE of ln(next_cost_proxy), log space (tooltip in the same file)",
      r2Log: "R^2 in log space",
      within10: "% of test predictions within +/-10% relative error after exp() back-transform (original scale)",
      within20: "not computed in any repo (null)"
    },
    measuredOn: "Hold-out test set. model/test_*.py cmd_test() (AI @ f497cce): rows with year != 2022 (2017-2021); train_test_split(test_size=0.1, random_state=42, shuffle=True). The remaining rows are split 0.1 again into val, so the split is train 81% / val 9% / test 10%, random by row, not by year. The dashboard file itself does not state the split.",
    models: [
      { id: "catboost",     model: "CatBoost",     within10: 97.24, within20: null, rmseLog: 0.044001, r2Log: 0.999853, mae: null, mape: null },
      { id: "randomforest", model: "RandomForest", within10: 92.10, within20: null, rmseLog: 0.070965, r2Log: 0.999618, mae: null, mape: null },
      { id: "xgboost",      model: "XGBoost",      within10: 90.29, within20: null, rmseLog: 0.088003, r2Log: 0.999412, mae: null, mape: null },
      { id: "lightgbm",     model: "LightGBM",     within10: 89.63, within20: null, rmseLog: 0.087926, r2Log: 0.999413, mae: null, mape: null }
    ],
    baseline: {
      model: "LinearRegression",
      file: "AI model/base_line.py",
      features: ["value", "CPIAUCSL", "UNRATE", "value_per_ton", "pop_sum", "pop_ratio"],
      split: "random 80/20 (random_state=42), year != 2022",
      results: null,
      note: "The script prints log/original RMSE, R^2 and the +/-10% share, but no output is committed."
    }
  },

  /* 2. FEATURE IMPORTANCE --------------------------------------------------- */
  importance: {
    source: "FE develop components/feature-importance/feature-importance.js MODEL_DATA[*].features (percent of total importance)",
    verification: "The XGBoost list was recomputed from BE model/xgboost_faf01.json (3142 trees, xgboost 3.2.0) as average split gain per feature, normalised. It matches exactly: tons 72.2651, value 20.1249, dist_km_mid 5.6687, CPIAUCSL 0.8719, UNRATE 0.5988, diesel_avg 0.4705.",
    chosenModelNote: "No repo names a single final model. The backend serves all four. The dashboard default is 'catboost' (FE develop shared/store.js state.model).",
    byModel: {
      randomforest: [
        { feature: "tons", pct: 77.25 }, { feature: "value", pct: 18.47 }, { feature: "dist_km_mid", pct: 3.75 },
        { feature: "CPIAUCSL", pct: 0.26 }, { feature: "diesel_avg", pct: 0.17 }, { feature: "UNRATE", pct: 0.10 }
      ],
      xgboost: [
        { feature: "tons", pct: 72.27 }, { feature: "value", pct: 20.12 }, { feature: "dist_km_mid", pct: 5.67 },
        { feature: "CPIAUCSL", pct: 0.87 }, { feature: "UNRATE", pct: 0.60 }, { feature: "diesel_avg", pct: 0.47 }
      ],
      lightgbm: [
        { feature: "tons", pct: 78.37 }, { feature: "value", pct: 17.32 }, { feature: "dist_km_mid", pct: 3.77 },
        { feature: "CPIAUCSL", pct: 0.25 }, { feature: "diesel_avg", pct: 0.15 }, { feature: "UNRATE", pct: 0.14 }
      ],
      catboost: [
        { feature: "tons", pct: 82.28 }, { feature: "dist_km_mid", pct: 13.63 }, { feature: "value", pct: 1.62 },
        { feature: "UNRATE", pct: 0.60 }, { feature: "year", pct: 0.57 }, { feature: "diesel_avg", pct: 0.45 },
        { feature: "CPIAUCSL", pct: 0.43 }, { feature: "sctg2", pct: 0.37 }, { feature: "dms_orig", pct: 0.02 },
        { feature: "dms_dest", pct: 0.02 }
      ]
    },
    xgboostSplitShare: {
      source: "BE model/xgboost_faf01.json, number of splits per feature / all splits (computed here)",
      values: [
        { feature: "value", pct: 26.49 }, { feature: "tons", pct: 26.45 }, { feature: "diesel_avg", pct: 17.89 },
        { feature: "dist_km_mid", pct: 16.02 }, { feature: "CPIAUCSL", pct: 6.83 }, { feature: "UNRATE", pct: 6.31 }
      ]
    }
  },

  /* 3. VIF ------------------------------------------------------------------- */
  vif: {
    source: "AI analysis/vif.R (R car::vif on an lm() fit) and its git history",
    values: null,
    threshold: null,
    note: "No VIF output or threshold is committed. Below: the variable sets checked in each version of vif.R, and the final model inputs.",
    history: [
      { date: "2026-04-06", commit: "f0947c6", data: "data/raw/FAF5_features.csv", response: "value",
        features: ["tons", "tmiles", "diesel_avg", "dist_km_mid", "GDP", "UNRATE"] },
      { date: "2026-04-19", commit: "468dfcb", data: "data/raw/FAF5_features_v2.csv", response: "value",
        features: ["tons", "tmiles", "dist_km_mid", "GDP", "UNRATE", "pop_sum", "pop_ratio"] },
      { date: "2026-05-01", commit: "9f327fc", data: "data/raw/FAF5_features_v2.csv", response: "cost_proxy",
        features: ["value", "tmiles", "GDP", "UNRATE", "pop_sum", "pop_ratio"] },
      { date: "2026-05-12", commit: "63ba0ba", data: "data/processed/FAF5_features_v2_with_next_cp_per_value.csv", response: "next_cp_per_value",
        features: ["tons", "value", "tmiles", "diesel_avg", "dist_km_mid", "CPIAUCSL", "UNRATE", "value_per_ton", "pop_sum", "pop_ratio"] }
    ],
    finalNumericFeatures: ["tons", "value", "diesel_avg", "dist_km_mid", "CPIAUCSL", "UNRATE"],
    notInFinalFromLastVifSet: ["tmiles", "value_per_ton", "pop_sum", "pop_ratio"],
    catboostExtraCategorical: ["dms_orig", "dms_dest", "sctg2", "year"]
  },

  /* 4. DATASET ------------------------------------------------------------------ */
  dataset: {
    raw: {
      file: "data/raw/FAF5.7.1.csv (gitignored)",
      source: "AI anlayze/FAF5.71_study.ipynb (deleted in 8081cf4; read from commit e3e21b8), cell outputs",
      rows: 1048575,
      rowsCaveat: "1,048,575 equals the Excel worksheet row limit (2^20 - 1). The repo does not show whether the CSV was truncated.",
      columns: 56,
      rowsByTradeType: { "1 (domestic)": 522752, "2 (import)": 525823 },
      originRegions: 132,
      destRegions: 132,
      sctg2Codes: 42,
      rowsByDistBand: { "1": 39580, "2": 96718, "3": 153716, "4": 143037, "5": 134447, "6": 185335, "7": 106985, "8": 188757 },
      rowsByDmsMode: { "1": 448489, "2": 111310, "3": 15359, "4": 167021, "5": 297557, "6": 3213, "7": 5509, "8": 117 },
      rowsBySctg2: {
        "1": 9610, "2": 11210, "3": 35394, "4": 25323, "5": 26130, "6": 25502, "7": 46413, "8": 21028, "9": 7485,
        "10": 4986, "11": 5316, "12": 6541, "13": 20104, "14": 6431, "15": 1928, "16": 2303, "17": 5476, "18": 8134,
        "19": 18903, "20": 51172, "21": 42151, "22": 16852, "23": 58887, "24": 78713, "25": 5306, "26": 44300,
        "27": 31862, "28": 38404, "29": 47031, "30": 68418, "31": 14784, "32": 17301, "33": 24423, "34": 27580,
        "35": 33977, "36": 28724, "37": 21180, "38": 22107, "39": 23794, "40": 33425, "41": 3516, "43": 26451
      }
    },
    processed: {
      files: ["FAF5_features.csv (2026-04-06)", "FAF5_features_v2.csv (2026-04-19)", "FAF5_features_v2_with_next_cp.csv (2026-05-12)", "FAF5_features_v2_with_next_cp_per_value.csv (vif.R)"],
      note: "File names come from the read_csv paths in the AI scripts. The files are gitignored.",
      aggregatedRows: null,
      odPairs: 16491,
      odYearRecords: 98946,
      years: [2017, 2018, 2019, 2020, 2021, 2022],
      odSource: "FE develop data/diesel_avg_by_od_year.json (16,491 OD pairs x 6 years) and BE data/dist_km_mid_dict.json (16,491 OD pairs)",
      regions: 132,
      regionSource: "BE data/region_map.json (132 FAF5 CFS zones)"
    },
    features: {
      readmeColumns: { categorical: 10, numeric: 21, source: "AI README.md sections 4-1 and 4-2 (2 categorical are marked '필요 x': dist_band, sctg_category)" },
      categorical: ["dms_orig", "dms_dest", "sctg2", "dist_band", "year", "padd_orig", "padd_dest", "sctg_category", "is_intrazone", "is_covid"],
      numeric: ["tons", "value", "tmiles", "diesel_orig", "diesel_dest", "diesel_avg", "dist_km_mid", "cost_proxy", "GDP", "CPIAUCSL", "UNRATE",
                "value_per_ton", "tons_lag1", "value_lag1", "tons_yoy", "pop_orig", "pop_dest", "pop_sum", "pop_ratio", "domesticmig_orig", "domesticmig_dest"],
      vifCandidates: 10,
      finalNumeric: 6,
      finalCatboostTotal: 10
    },
    splits: {
      asCoded: {
        source: "AI model/test_*.py and optuna/*_optuna.py @ f497cce",
        rowsUsed: "year != 2022 (2017-2021)",
        models: "random train 81% / val 9% / test 10% (random_state=42); 5-fold KFold CV on train+val; final fit on train+val",
        optuna: "random 80/20 train/val (random_state=42)"
      },
      asDocumented: {
        source: "FE README.md line 3 and FE main components/cost-drivers/cost-drivers.js",
        train: [2017, 2018, 2019, 2020], val: [2021], test: [2022]
      },
      yearSplitInCodeHistory: "AI model/test_catboost.py and optuna/catboost_optuna.py used train 2017-2020 / val 2021 / test 2022 from ca5cde2 (2026-04-07) to 9f327fc. At that time the target was 'value'. From f497cce (2026-05-23) the code uses the random split.",
      costDriversChart: {
        source: "FE main components/cost-drivers/cost-drivers.js YEAR_DATA",
        caveat: "Code comment: 'static (sample values from the presentation deck p.8)'. These are not computed.",
        values: [ { year: 2017, v: 42, split: "train" }, { year: 2018, v: 65, split: "train" }, { year: 2019, v: 60, split: "train" },
                  { year: 2020, v: 38, split: "train" }, { year: 2021, v: 62, split: "val" }, { year: 2022, v: 96, split: "test" } ]
      }
    }
  },

  /* Axis definitions available for breakdown charts. Error values are absent (see meta.missing). */
  dimensions: {
    sctgGroups: { source: "FE main shared/data.js cargoCategories", values: ["Minerals_Energy", "Agriculture", "Industrial", "Wood_Paper", "Waste_Mixed", "Chemical_Mfg"] },
    distBands: {
      source: "BE data/dist_km_mid_dict.json: 8 distinct dist_km_mid values and OD pairs per value (band number = rank of midpoint, inferred)",
      values: [
        { band: 1, kmMid: 120.675, odPairs: 162 }, { band: 2, kmMid: 281.575, odPairs: 664 },
        { band: 3, kmMid: 603.375, odPairs: 1777 }, { band: 4, kmMid: 1005.625, odPairs: 2396 },
        { band: 5, kmMid: 1407.875, odPairs: 2399 }, { band: 6, kmMid: 2011.25, odPairs: 3888 },
        { band: 7, kmMid: 2815.75, odPairs: 2228 }, { band: 8, kmMid: 4022.5, odPairs: 2977 }
      ]
    },
    padd: {
      source: "FE shared/geo-constants.js paddInfo",
      values: [ { id: "PADD1", name: "East Coast" }, { id: "PADD2", name: "Midwest" }, { id: "PADD3", name: "Gulf Coast" },
                { id: "PADD4", name: "Rocky Mountain" }, { id: "PADD5", name: "West Coast" } ]
    }
  },

  /* External inputs as stored for the dashboard (2017-2022). */
  macro: {
    source: "FE develop data/cpiaucsl.json, data/unrate.json; diesel = mean/min/max over the 16,491 OD-pair diesel_avg values per year in data/diesel_avg_by_od_year.json (computed here, rounded to 4 dp)",
    years:      [2017, 2018, 2019, 2020, 2021, 2022],
    cpi:        [245.121, 251.0995, 255.652583, 258.85575, 270.973417, 292.626417],
    unrate:     [4.358333, 3.891667, 3.675, 8.1, 5.35, 3.65],
    dieselMean: [2.6635, 3.1877, 3.065, 2.5702, 3.2894, 5.0276],
    dieselMin:  [2.4874, 2.9612, 2.8195, 2.3179, 3.0338, 4.6923],
    dieselMax:  [2.9685, 3.645, 3.617, 3.0878, 3.8468, 5.6248]
  },

  /* 5. OPTUNA -------------------------------------------------------------------- */
  optuna: {
    common: "TPESampler(seed=10), minimise RMSE of ln(next_cost_proxy) on a random 20% val split; data FAF5_features_v2_with_next_cp.csv, year != 2022",
    bestScores: null,
    models: [
      { model: "RandomForest", file: "AI optuna/randomforest_optuna.py; params from model/test_randomforest.py",
        nTrials: 50, timeoutSec: 60000,
        searchSpace: { n_estimators: [200, 800], max_depth: [8, 30], min_samples_split: [2, 30], min_samples_leaf: [1, 20], max_features: [0.4, 1.0], bootstrap: [true], max_samples: [0.5, 1.0] },
        paramsInUse: { n_estimators: 150, max_depth: 16, min_samples_split: 12, min_samples_leaf: 15, max_features: 0.65, bootstrap: true, max_samples: 0.65 },
        commentedOutOptunaResult: { n_estimators: 319, max_depth: 25, min_samples_split: 6, min_samples_leaf: 2, max_features: 0.8112158910206784, bootstrap: true, max_samples: 0.9766966730974682 },
        note: "The active n_estimators=150 is outside the search range (200-800), so the active params appear hand-set. The commented block is inside the range." },
      { model: "XGBoost", file: "AI optuna/xgboost_optuna.py; params from model/test_xgboost.py",
        nTrials: 50, timeoutSec: 6000, earlyStoppingRoundsInCV: 56,
        paramsInUse: { n_estimators: 3142, learning_rate: 0.01681070710843978, max_depth: 9, min_child_weight: 37.33840342968952, subsample: 0.8774244101704401, colsample_bytree: 0.9084410043451838, colsample_bynode: 0.7097668872639996, reg_lambda: 0.16706233860599437, reg_alpha: 0.0018449221360920221, gamma: 0.025013395717656664 },
        note: "BE model/xgboost_faf01.json contains 3142 trees, which matches n_estimators." },
      { model: "LightGBM", file: "AI optuna/lgb_optuna.py; params from model/test_lgb.py",
        nTrials: 50, timeoutSec: 6000, earlyStoppingRoundsInCV: 56,
        paramsInUse: { n_estimators: 4956, learning_rate: 0.012660614353322046, num_leaves: 40, max_depth: 8, min_child_samples: 99, min_child_weight: 7.8478592251343855, subsample: 0.866135228030412, subsample_freq: 1, colsample_bytree: 0.9025994098857054, reg_alpha: 0.013384894594240332, reg_lambda: 0.0011127750752562596, min_split_gain: 0.004291971291756045 } },
      { model: "CatBoost", file: "AI optuna/catboost_optuna.py; params from model/test_catboost.py",
        nTrials: 10, timeoutSec: null, earlyStoppingRounds: 10,
        paramsInUse: { bootstrap_type: "Bayesian", iterations: 2319, learning_rate: 0.056516184841909185, depth: 8, reg_lambda: 0.002017807587405412, random_strength: 4.6453080777933256, colsample_bylevel: 0.9127796474476594, min_data_in_leaf: 23, od_wait: 71, bagging_temperature: 0.37094413234407875 } }
    ]
  },

  /* 6. PIPELINE (as implemented, in order) ---------------------------------------- */
  pipeline: [
    { step: 1, file: "precessing/FAF_proc.py", fn: "domestic(), overseas2america()", label: "국내·수입 흐름 분리", detail: "FAF5.7.1.csv에서 국내(dms_orig→dms_dest)와 해외→미국(fr_orig 존재) 행을 나누고 2018–2024 tons·value·current_value·tmiles 컬럼 선택" },
    { step: 2, file: "precessing/classification.py", fn: "total()", label: "출발·도착 쌍 합산", detail: "dms_orig × dms_dest 기준 연도별 수치 groupby 합계" },
    { step: 3, file: null, label: "외부 데이터 결합·파생변수", detail: "README 컬럼: 디젤(orig/dest/avg), GDP·CPIAUCSL·UNRATE, 인구·국내 순이동, lag·yoy, value_per_ton, cost_proxy. 결합 코드는 저장소에 없음(산출 CSV는 gitignore)" },
    { step: 4, file: "precessing/IQR.py", fn: "IQR()", label: "IQR 이상치 제거", detail: "12개 수치 컬럼을 차례로 Q1−1.5·IQR ~ Q3+1.5·IQR 밖 행 제거 (함수만 정의, 호출부 없음)" },
    { step: 5, file: "analysis/vif.R", label: "VIF 다중공선성 검사", detail: "car::vif(lm(next_cp_per_value ~ 10개 변수)) → 최종 수치 입력 6개" },
    { step: 6, file: "model/base_line.py", label: "선형회귀 베이스라인", detail: "LinearRegression, 무작위 80/20" },
    { step: 7, file: "model/test_*.py", label: "로그 변환·분할", detail: "tons·value·diesel_avg·dist_km_mid와 타깃 next_cost_proxy에 ln, 2022 제외, 무작위 81/9/10" },
    { step: 8, file: "optuna/*_optuna.py", label: "Optuna 튜닝", detail: "TPE(seed 10), 검증 RMSE 최소화: RF·XGB·LGBM 50회, CatBoost 10회" },
    { step: 9, file: "model/test_*.py train", label: "5-Fold CV·재학습", detail: "KFold(5) RMSE 확인 후 train+val 전체로 최종 모델 저장" },
    { step: 10, file: "model/test_*.py test", label: "평가", detail: "로그 RMSE·R², exp 복원 후 ±10% 이내 비율" },
    { step: 11, file: "nomad-backend api/predict.py, api/route.py", label: "FastAPI 서빙", detail: "4개 모델 로드, 입력 ln → 예측 exp, 지역명→코드·거리 변환" },
    { step: 12, file: "nomad-backend analysis/groq.py", label: "LLM 절감 대안", detail: "4개 모델 예측·요약을 llama-3.3-70b-versatile(Groq)에 전달" },
    { step: 13, file: "FAF5_Features (develop)", label: "대시보드", detail: "경로·품목·연도·모델 입력 → 예측 비용·지도·중요도·AI 분석" }
  ],

  /* 7. DASHBOARD (FE develop @ b21d921 unless noted) ------------------------------- */
  dashboard: {
    title: "FAF5 기반 트럭 운송 수요 예측",
    source: "FE develop index.html, main.js, components/*, shared/*",
    inputs: [
      { label: "출발지·도착지", detail: "FAF5 CFS 지역 132곳, PADD별 그룹 검색 모달", file: "shared/modal/location-modal.js, data/region_map.json" },
      { label: "품목", detail: "SCTG2 42개 품목 검색 모달", file: "data/sctg.json" },
      { label: "년도", detail: "2017–2022", file: "components/cargo-category/cargo-category.js" },
      { label: "모델", detail: "CatBoost·XGBoost·LightGBM·Random Forest (기본 CatBoost)", file: "shared/store.js" },
      { label: "물동량", detail: "0–150,000 tons 슬라이더", file: "components/cargo-category/cargo-category.js" },
      { label: "가치", detail: "0–100,000 슬라이더", file: "components/cargo-category/cargo-category.js" }
    ],
    autoFilled: [
      { label: "유가", detail: "(출발, 도착, 연도)별 diesel_avg 조회", file: "data/diesel_avg_by_od_year.json" },
      { label: "CPI·실업률", detail: "연도별 CPIAUCSL·UNRATE 조회", file: "data/cpiaucsl.json, data/unrate.json" },
      { label: "거리", detail: "길찾기 → dist_km_mid", file: "BE data/dist_km_mid_dict.json" }
    ],
    actions: [
      { label: "길찾기", method: "POST", endpoint: "http://localhost:8000/convert-region" },
      { label: "내년 예상 운송 비용", method: "POST", endpoint: "http://localhost:8000/predict/{model}/next-cost-proxy" },
      { label: "분석 시작", method: "POST", endpoint: "http://localhost:8000/analysis/next-cost-proxy/alternatives" }
    ],
    outputs: [
      { label: "내년 예상 운송 비용", detail: "$ 예측값 + 거리·유가·CPI·실업률", file: "components/predicted-cost/predicted-cost.js" },
      { label: "미국 지도", detail: "주 경계 SVG, 선택 경로의 PADD 강조, 경로선·트럭 아이콘, 줌·드래그", file: "components/map/map.js" },
      { label: "Feature Importance", detail: "모델별 RMSE·R²·±10% 정확도와 상위 변수 막대(고정값)", file: "components/feature-importance/feature-importance.js" },
      { label: "비용 절감 분석", detail: "AI 물류 대안 제안(LLM 응답 렌더링)", file: "components/recommended-carriers/recommended-carriers.js" }
    ],
    fallback: "API 실패 시 로컬 추정: tons × 거리 × 3.2 / 1000 × 1.08 (predicted-cost.js localPredict)",
    llm: {
      provider: "Groq", model: "llama-3.3-70b-versatile",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      temperature: 0.4, timeoutSec: 60,
      file: "BE analysis/groq.py",
      calledVia: "프론트 → 백엔드 /analysis/next-cost-proxy/alternatives → Groq (프론트가 LLM을 직접 호출하지 않음)",
      input: "입력 10개 값 + 4개 모델 예측 + 최저·최고·평균·편차(%)",
      outputSections: ["모델 예측 비교", "비용 절감 대안 3~5가지", "권장 조치 1~2가지"],
      language: "한국어"
    },
    carriers: {
      branch: "main only (bd10738)",
      file: "FE main components/recommended-carriers/recommended-carriers.js",
      detail: "Top 5 'By Cost' 캐리어 목록. 코드 주석상 데모용 샘플 데이터(CARRIERS 상수)이며 실제 매칭 아님",
      names: ["Schneider Reg", "J.B. Hunt", "XPO Logistics", "Knight-Swift", "Yellow Reg"],
      status: "develop b21d921에서 '비용 절감 분석'(LLM) 카드로 교체"
    },
    mainBranchVersion: "main: 15개 허브 도시, 경유지 추가, 구간별 운송수단 휴리스틱 추천(truck/rail/air), Cost Drivers 막대(샘플값), 매크로 고정값(2022) 사용"
  },

  /* 8. CONTRIBUTIONS (git facts only; author names exactly as git shows them) --------- */
  contrib: {
    method: "git shortlog -sn --all; git log --all --date=short; files-changed counts per top-level path (non-merge commits). Line counts exclude .json/.ipynb/us-states.js/dashboard html. commitsDesc summarises each commit diff (most messages are just \"update\").",
    repos: [
      { repo: "nomad-AI", authors: [
        { name: "박성철", commits: 12, first: "2026-03-30", last: "2026-05-23", note: "includes 1 merge commit",
          touched: { "model/": 24, "optuna/": 11, "precessing/": 11, ".gitignore": 7, "build/": 6, "README.md": 5, "requirements.txt": 5, "analysis/": 4, "anlayze/": 3, "build_graph/": 3 },
          lines: { added: 2138, deleted: 731 } },
        { name: "PARK SUNGCHEOL", commits: 2, first: "2026-03-30", last: "2026-04-02",
          touched: { "README.md": 1, "anlayze/": 1 }, commitsDesc: ["Initial commit", "Delete anlayze directory"] }
      ] },
      { repo: "nomad-backend", authors: [
        { name: "박성철", commits: 5, first: "2026-05-14", last: "2026-06-01",
          touched: { "api/": 12, "__pycache__/": 4, ".gitignore": 3, "data/": 3, "main.py": 3, "analysis/": 2, "model/": 1 },
          lines: { added: 412, deleted: 33 } },
        { name: "PARK SUNGCHEOL", commits: 1, first: "2026-03-30", last: "2026-03-30", touched: { "README.md": 1 }, commitsDesc: ["Initial commit"] }
      ] },
      { repo: "FAF5_Features", authors: [
        { name: "박원찬", commits: 5, first: "2026-03-31", last: "2026-05-14", branch: "main",
          touched: { "components/": 15, "shared/": 8, "README.md": 3, "styles/": 3, "nomad_freight_dashboard.html": 2, "index.html": 1, "main.js": 1 },
          lines: { added: 2497, deleted: 11 },
          commitsDesc: ["Initial commit", "single-file dashboard upload (later deleted)", "component-based frontend upload (28 files)", "README update", "delete single-file html"] },
        { name: "박성철", commits: 4, first: "2026-05-22", last: "2026-06-01", branch: "develop (not merged into main)",
          touched: { "components/": 23, "shared/": 20, "data/": 6, "README.md": 3, "index.html": 3, "main.js": 3 },
          lines: { added: 1451, deleted: 1128 },
          commitsDesc: ["region map + location data", "API wiring, SCTG/year/model pickers, data JSON", "feature-importance card (replaces cost-drivers)", "LLM analysis card (replaces carriers)"] }
      ] }
    ]
  }
};
