/*
  storage.js — 게임패드 버튼 매핑 값을 localStorage에 저장/복원
  새로고침하거나 나중에 다시 접속해도 학생이 설정한 버튼 값이 유지됩니다.
*/

const MAPPING_STORAGE_KEY = 'rccar-gamepad-mapping-v1';

// 아두이노 펌웨어(rc_car_firmware.ino)의 기본 명령 체계와 맞춘 기본값
// F/B/L/R/S: 이동, U: 속도 단계 증가(+25), D: 속도 단계 감소(-25)
const DEFAULT_MAPPING = {
  up: 'F',
  down: 'B',
  left: 'L',
  right: 'R',
  stop: 'S',
  action1: 'U', // 속도 올리기
  action2: 'D', // 속도 내리기
};

function loadMapping() {
  try {
    const raw = localStorage.getItem(MAPPING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MAPPING };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_MAPPING, ...parsed };
  } catch (err) {
    console.warn('버튼 매핑 값을 불러오지 못해 기본값을 사용합니다.', err);
    return { ...DEFAULT_MAPPING };
  }
}

function saveMapping(mapping) {
  localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mapping));
}

function resetMapping() {
  localStorage.removeItem(MAPPING_STORAGE_KEY);
  return { ...DEFAULT_MAPPING };
}
