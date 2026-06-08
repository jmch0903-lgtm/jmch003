/* ==========================================================================
   CBT APP STATE MANAGEMENT
   ========================================================================== */

const state = {
  questions: [],          // Loaded from questions.json
  currentIndex: 0,        // Active question index (0 to 49)
  userAnswers: {},        // Stores { questionIndex: selectedOptionIndex }
  flaggedQuestions: new Set(), // Set of flagged question indices
  userName: '응시자',
  examMode: 'practice',   // 'practice' or 'exam'
  startTime: null,
  timeSpent: 0,           // in seconds
  timeRemaining: 3600,    // 60 minutes in seconds
  timerInterval: null,
  isSubmitted: false,
  soundEnabled: true,
  darkTheme: true,
  gradedResult: null      // Graded summary for the results view
};

// DOM Cache
const dom = {
  // Screens
  welcomeScreen: document.getElementById('welcome-screen'),
  examScreen: document.getElementById('exam-screen'),
  resultScreen: document.getElementById('result-screen'),
  
  // Welcome Inputs
  userNameInput: document.getElementById('user-name'),
  startBtn: document.getElementById('start-btn'),
  
  // Header Controls
  themeToggle: document.getElementById('theme-toggle'),
  soundToggle: document.getElementById('sound-toggle'),
  
  // Exam UI
  activeModeBadge: document.getElementById('active-mode-badge'),
  candidateName: document.getElementById('candidate-name'),
  timer: document.getElementById('timer'),
  timerBox: document.getElementById('timer-box'),
  qNumberTitle: document.getElementById('q-number-title'),
  flagBtn: document.getElementById('flag-btn'),
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  feedbackContainer: document.getElementById('feedback-container'),
  feedbackIcon: document.getElementById('feedback-icon'),
  feedbackText: document.getElementById('feedback-text'),
  feedbackRationale: document.getElementById('feedback-rationale'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  hintBtn: document.getElementById('hint-btn'),
  hintTooltip: document.getElementById('hint-tooltip'),
  hintContent: document.getElementById('hint-content'),
  
  // Sidebar UI
  progressPercent: document.getElementById('progress-percent'),
  progressFill: document.getElementById('progress-fill'),
  qGrid: document.getElementById('q-grid'),
  submitExamBtn: document.getElementById('submit-exam-btn'),
  
  // Results UI
  resultBadge: document.getElementById('result-badge'),
  resultTitle: document.getElementById('result-title'),
  resultUserName: document.getElementById('result-user-name'),
  resultScore: document.getElementById('result-score'),
  resultCorrectCount: document.getElementById('result-correct-count'),
  resultTimeSpent: document.getElementById('result-time-spent'),
  resultWrongRate: document.getElementById('result-wrong-rate'),
  restartBtn: document.getElementById('restart-btn'),
  reviewList: document.getElementById('review-list'),
  filterCorrectCount: document.getElementById('filter-correct-count'),
  filterWrongCount: document.getElementById('filter-wrong-count'),
  filterFlaggedCount: document.getElementById('filter-flagged-count'),
  
  // Sounds
  sndClick: document.getElementById('audio-click'),
  sndSuccess: document.getElementById('audio-success'),
  sndFail: document.getElementById('audio-fail')
};

/* ==========================================================================
   INITIALIZATION & SOUNDS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  loadThemeSettings();
  setupEventListeners();
  await loadQuestions();
}

function playSound(audioEl) {
  if (state.soundEnabled && audioEl) {
    audioEl.currentTime = 0;
    audioEl.play().catch(e => console.log('Sound blocked by browser policy'));
  }
}

// Theme loading/saving
function loadThemeSettings() {
  const savedTheme = localStorage.getItem('cbt-theme');
  if (savedTheme === 'light') {
    state.darkTheme = false;
    document.body.className = 'light-theme';
    dom.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  } else {
    state.darkTheme = true;
    document.body.className = 'dark-theme';
    dom.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }

  const savedSound = localStorage.getItem('cbt-sound');
  if (savedSound === 'disabled') {
    state.soundEnabled = false;
    dom.soundToggle.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
  } else {
    state.soundEnabled = true;
    dom.soundToggle.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
  }
}

function toggleTheme() {
  playSound(dom.sndClick);
  state.darkTheme = !state.darkTheme;
  if (state.darkTheme) {
    document.body.className = 'dark-theme';
    dom.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    localStorage.setItem('cbt-theme', 'dark');
  } else {
    document.body.className = 'light-theme';
    dom.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    localStorage.setItem('cbt-theme', 'light');
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  if (state.soundEnabled) {
    dom.soundToggle.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    localStorage.setItem('cbt-sound', 'enabled');
    playSound(dom.sndClick);
  } else {
    dom.soundToggle.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    localStorage.setItem('cbt-sound', 'disabled');
  }
}

/* ==========================================================================
   DATA LOAD
   ========================================================================== */

async function loadQuestions() {
  try {
    const response = await fetch('./questions.json');
    if (!response.ok) throw new Error('Failed to load questions JSON');
    state.questions = await response.json();
    console.log(`Loaded ${state.questions.length} questions successfully.`);
  } catch (error) {
    console.error('Error loading questions:', error);
    alert('모의고사 문제 파일을 불러오지 못했습니다. 루트 폴더의 questions.json 파일을 확인해주세요.');
  }
}

/* ==========================================================================
   EVENT ROUTERS Setup
   ========================================================================== */

function setupEventListeners() {
  // Theme & Sound Toggle
  dom.themeToggle.addEventListener('click', toggleTheme);
  dom.soundToggle.addEventListener('click', toggleSound);

  // Start Exam
  dom.startBtn.addEventListener('click', handleStartExam);

  // Navigation Button Triggers
  dom.prevBtn.addEventListener('click', () => navigateQuestion(-1));
  dom.nextBtn.addEventListener('click', () => navigateQuestion(1));
  
  // Hint Tooltip Trigger
  dom.hintBtn.addEventListener('click', toggleHint);
  
  // Flag Question Toggle
  dom.flagBtn.addEventListener('click', toggleFlagQuestion);

  // Submit entire exam
  dom.submitExamBtn.addEventListener('click', handleSubmitExam);

  // Restart
  dom.restartBtn.addEventListener('click', handleRestartApp);

  // Review Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      filterReviewList(e.currentTarget.getAttribute('data-filter'));
    });
  });

  // Close hint tooltip when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!dom.hintBtn.contains(e.target) && !dom.hintTooltip.contains(e.target)) {
      dom.hintTooltip.classList.add('hidden');
    }
  });
}

/* ==========================================================================
   STATE-DRIVEN SCREEN SWAPS
   ========================================================================== */

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  setTimeout(() => {
    document.querySelectorAll('.screen').forEach(s => {
      if (s.id === screenId) {
        s.style.display = 'block';
        setTimeout(() => s.classList.add('active'), 20);
      } else {
        s.style.display = 'none';
      }
    });
  }, 200);
}

/* ==========================================================================
   EXAM TIMERS & PROGRESS
   ========================================================================== */

function startTimer() {
  state.startTime = new Date();
  state.timeRemaining = 3600; // Reset to 60 mins
  dom.timerBox.classList.remove('warning-time');

  updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    state.timeRemaining--;
    state.timeSpent = 3600 - state.timeRemaining;
    updateTimerDisplay();

    // Warn at under 5 minutes (300 seconds)
    if (state.timeRemaining <= 300) {
      dom.timerBox.classList.add('warning-time');
    }

    if (state.timeRemaining <= 0) {
      clearInterval(state.timerInterval);
      alert('시험 시간이 만료되었습니다. 답안이 자동으로 제출됩니다.');
      gradeAndSubmit();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(state.timeRemaining / 60);
  const seconds = state.timeRemaining % 60;
  dom.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
}

function updateProgress() {
  const answeredCount = Object.keys(state.userAnswers).length;
  const totalQuestions = state.questions.length;
  const percent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  
  dom.progressPercent.textContent = `${percent}% (${answeredCount}/${totalQuestions})`;
  dom.progressFill.style.width = `${percent}%`;
}

/* ==========================================================================
   EXAM LOGIC: START / NAV / RENDER
   ========================================================================== */

function handleStartExam() {
  playSound(dom.sndClick);
  if (state.questions.length === 0) {
    alert('모의고사 데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  // Record user name
  const nameVal = dom.userNameInput.value.trim();
  state.userName = nameVal || '응시자';
  dom.candidateName.textContent = `응시자: ${state.userName}`;

  // Get Mode
  const selectedMode = document.querySelector('input[name="exam-mode"]:checked').value;
  state.examMode = selectedMode;

  if (state.examMode === 'practice') {
    dom.activeModeBadge.textContent = '연습 모드';
    dom.activeModeBadge.style.background = 'var(--primary-glow)';
    dom.activeModeBadge.style.color = 'var(--primary)';
  } else {
    dom.activeModeBadge.textContent = '실전 모드';
    dom.activeModeBadge.style.background = 'rgba(244, 63, 94, 0.1)';
    dom.activeModeBadge.style.color = 'var(--error)';
  }

  // Reset exam states
  state.currentIndex = 0;
  state.userAnswers = {};
  state.flaggedQuestions.clear();
  state.isSubmitted = false;

  // Initialize UI
  buildQuestionGrid();
  renderQuestion();
  updateProgress();
  
  // Show Screen & Start Timer
  showScreen('exam-screen');
  startTimer();
}

function buildQuestionGrid() {
  dom.qGrid.innerHTML = '';
  state.questions.forEach((_, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'q-grid-btn';
    btn.id = `grid-btn-${idx}`;
    btn.textContent = idx + 1;
    btn.addEventListener('click', () => {
      playSound(dom.sndClick);
      saveAndNavigate(idx);
    });
    dom.qGrid.appendChild(btn);
  });
}

function updateQuestionGridUI() {
  state.questions.forEach((_, idx) => {
    const btn = document.getElementById(`grid-btn-${idx}`);
    if (!btn) return;

    btn.className = 'q-grid-btn'; // Reset classes

    if (idx === state.currentIndex) {
      btn.classList.add('current');
    }
    
    if (state.userAnswers[idx] !== undefined) {
      btn.classList.add('answered');
    }

    if (state.flaggedQuestions.has(idx)) {
      btn.classList.add('flagged');
    }
  });
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  if (!question) return;

  // Question Title
  dom.qNumberTitle.textContent = `Q${question.questionNumber}`;
  dom.questionText.textContent = question.question;
  
  // Hide Hint Tooltip
  dom.hintTooltip.classList.add('hidden');
  dom.hintContent.textContent = question.hint;

  // Flag Check State
  if (state.flaggedQuestions.has(state.currentIndex)) {
    dom.flagBtn.classList.add('flagged');
    dom.flagBtn.querySelector('span').textContent = '검토 중';
  } else {
    dom.flagBtn.classList.remove('flagged');
    dom.flagBtn.querySelector('span').textContent = '검토 표시';
  }

  // Render Choices
  dom.optionsContainer.innerHTML = '';
  const chosenOpt = state.userAnswers[state.currentIndex];
  
  question.answerOptions.forEach((option, oIdx) => {
    const box = document.createElement('div');
    box.className = 'option-box';
    if (chosenOpt === oIdx) box.classList.add('selected');

    // Marker
    const marker = document.createElement('div');
    marker.className = 'option-marker';
    marker.textContent = oIdx + 1;

    // Text
    const textSpan = document.createElement('span');
    textSpan.className = 'option-txt';
    textSpan.textContent = option.text;

    box.appendChild(marker);
    box.appendChild(textSpan);

    // Disable clicking if in Practice Mode and already answered
    if (state.examMode === 'practice' && chosenOpt !== undefined) {
      box.classList.add('disabled-interaction');
    } else {
      box.addEventListener('click', () => handleOptionSelect(oIdx));
    }

    dom.optionsContainer.appendChild(box);
  });

  // Render Practice Mode Feedback
  renderPracticeFeedback(question, chosenOpt);

  // Disable Prev/Next at boundaries
  dom.prevBtn.disabled = state.currentIndex === 0;
  dom.nextBtn.disabled = state.currentIndex === state.questions.length - 1;

  updateQuestionGridUI();
}

function handleOptionSelect(optionIndex) {
  if (state.isSubmitted) return;

  // Save answer
  state.userAnswers[state.currentIndex] = optionIndex;
  
  // Render immediately for visual updates
  renderQuestion();
  updateProgress();

  // Practice Mode Sound Feedback
  if (state.examMode === 'practice') {
    const question = state.questions[state.currentIndex];
    const isCorrect = question.answerOptions[optionIndex].isCorrect;
    if (isCorrect) {
      playSound(dom.sndSuccess);
    } else {
      playSound(dom.sndFail);
    }
  } else {
    playSound(dom.sndClick);
  }
}

function renderPracticeFeedback(question, chosenOpt) {
  if (state.examMode === 'practice' && chosenOpt !== undefined) {
    dom.feedbackContainer.classList.remove('hidden');
    
    const selectedOption = question.answerOptions[chosenOpt];
    const isCorrect = selectedOption.isCorrect;
    
    // Style option boxes based on correct/wrong
    const boxes = dom.optionsContainer.querySelectorAll('.option-box');
    
    question.answerOptions.forEach((opt, idx) => {
      if (opt.isCorrect) {
        boxes[idx].classList.add('correct-choice');
      } else if (idx === chosenOpt) {
        boxes[idx].classList.add('wrong-choice');
      }
    });

    if (isCorrect) {
      dom.feedbackContainer.className = 'feedback-container correct';
      dom.feedbackIcon.className = 'fa-solid fa-circle-check';
      dom.feedbackText.textContent = '정답입니다!';
    } else {
      dom.feedbackContainer.className = 'feedback-container wrong';
      dom.feedbackIcon.className = 'fa-solid fa-circle-xmark';
      dom.feedbackText.textContent = '오답입니다.';
    }

    // Display Rationale of Selected Option
    dom.feedbackRationale.textContent = selectedOption.rationale;
  } else {
    dom.feedbackContainer.classList.add('hidden');
  }
}

/* ==========================================================================
   NAVIGATION OPERATIONS
   ========================================================================== */

function saveAndNavigate(targetIndex) {
  state.currentIndex = targetIndex;
  renderQuestion();
}

function navigateQuestion(direction) {
  playSound(dom.sndClick);
  const nextIdx = state.currentIndex + direction;
  if (nextIdx >= 0 && nextIdx < state.questions.length) {
    saveAndNavigate(nextIdx);
  }
}

function toggleHint() {
  playSound(dom.sndClick);
  dom.hintTooltip.classList.toggle('hidden');
}

function toggleFlagQuestion() {
  playSound(dom.sndClick);
  if (state.flaggedQuestions.has(state.currentIndex)) {
    state.flaggedQuestions.delete(state.currentIndex);
  } else {
    state.flaggedQuestions.add(state.currentIndex);
  }
  renderQuestion();
}

/* ==========================================================================
   EXAM EVALUATION & SUBMISSIONS
   ========================================================================== */

function handleSubmitExam() {
  playSound(dom.sndClick);
  
  // Calculate remaining
  const unsubmittedCount = state.questions.length - Object.keys(state.userAnswers).length;
  
  let confirmMsg = '정말로 답안을 최종 제출하시겠습니까?';
  if (unsubmittedCount > 0) {
    confirmMsg = `아직 풀지 않은 문제가 ${unsubmittedCount}개 있습니다. 이대로 제출하시겠습니까?`;
  }

  if (confirm(confirmMsg)) {
    gradeAndSubmit();
  }
}

function gradeAndSubmit() {
  stopTimer();
  state.isSubmitted = true;
  
  // Calculate Correct count
  let correctCount = 0;
  state.questions.forEach((q, idx) => {
    const userChoice = state.userAnswers[idx];
    if (userChoice !== undefined && q.answerOptions[userChoice].isCorrect) {
      correctCount++;
    }
  });

  // Calculate score (out of 100)
  const scoreVal = Math.round((correctCount / state.questions.length) * 100);
  const isPass = scoreVal >= 70; // 70 points threshold

  // Record grading summary
  state.gradedResult = {
    score: scoreVal,
    correctCount: correctCount,
    isPass: isPass,
    timeSpentStr: formatTimeSpent(state.timeSpent)
  };

  // Sound cue
  if (isPass) {
    playSound(dom.sndSuccess);
  } else {
    playSound(dom.sndFail);
  }

  // Populate Result Screen
  renderResultScreen();
}

function formatTimeSpent(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}분 ${sec}초`;
}

/* ==========================================================================
   SCREEN 3: RESULTS & RATIONALES REVIEW
   ========================================================================== */

function renderResultScreen() {
  const res = state.gradedResult;
  dom.resultScore.textContent = res.score;
  dom.resultCorrectCount.textContent = `${res.correctCount} / ${state.questions.length}개`;
  dom.resultTimeSpent.textContent = res.timeSpentStr;
  dom.resultWrongRate.textContent = `${100 - res.score}%`;
  dom.resultUserName.textContent = state.userName;

  if (res.isPass) {
    dom.resultBadge.className = 'result-badge pass';
    dom.resultBadge.textContent = '합격';
    dom.resultTitle.textContent = '축하합니다! 시험에 합격하셨습니다.';
    dom.resultTitle.style.color = 'var(--success)';
  } else {
    dom.resultBadge.className = 'result-badge fail';
    dom.resultBadge.textContent = '불합격';
    dom.resultTitle.textContent = '아쉽게도 합격 기준을 달성하지 못했습니다.';
    dom.resultTitle.style.color = 'var(--error)';
  }

  // Trigger circular progress display
  const progressCircle = document.querySelector('.circular-progress');
  const targetDeg = (res.score / 100) * 360;
  
  // Set conic gradient smoothly
  progressCircle.style.background = `conic-gradient(var(--primary) ${targetDeg}deg, var(--bg-tertiary) ${targetDeg}deg)`;

  // Generate Review List Cards
  buildReviewList();

  // Show Results Screen
  showScreen('result-screen');
}

function buildReviewList() {
  dom.reviewList.innerHTML = '';
  
  let correctCount = 0;
  let wrongCount = 0;
  let flaggedCount = 0;

  state.questions.forEach((question, idx) => {
    const userChoice = state.userAnswers[idx];
    const isCorrect = userChoice !== undefined && question.answerOptions[userChoice].isCorrect;
    const isFlagged = state.flaggedQuestions.has(idx);

    if (isCorrect) correctCount++;
    else wrongCount++;
    if (isFlagged) flaggedCount++;

    const card = document.createElement('div');
    card.className = `review-item-card ${isCorrect ? 'correct-item' : 'wrong-item'}`;
    card.setAttribute('data-correct', isCorrect);
    card.setAttribute('data-flagged', isFlagged);
    card.id = `review-card-${idx}`;

    // Header
    const header = document.createElement('div');
    header.className = 'review-q-header';
    
    const numberSpan = document.createElement('span');
    numberSpan.className = 'review-q-number';
    numberSpan.textContent = `문항 ${question.questionNumber}`;
    
    const badge = document.createElement('span');
    badge.className = `review-q-badge ${userChoice === undefined ? 'unanswered' : (isCorrect ? 'correct' : 'wrong')}`;
    badge.textContent = userChoice === undefined ? '미제출' : (isCorrect ? '정답' : '오답');

    header.appendChild(numberSpan);
    header.appendChild(badge);

    // Question Text
    const qText = document.createElement('h3');
    qText.className = 'review-q-text';
    qText.textContent = question.question;

    // Options List
    const optionsList = document.createElement('div');
    optionsList.className = 'review-options-list';

    question.answerOptions.forEach((option, oIdx) => {
      const optDiv = document.createElement('div');
      optDiv.className = 'review-option';
      
      const optTextWrapper = document.createElement('div');
      optTextWrapper.className = 'review-option-text';
      
      const marker = document.createElement('span');
      marker.className = 'review-option-marker';
      marker.textContent = `[${oIdx + 1}]`;
      
      const txt = document.createTextNode(option.text);
      
      optTextWrapper.appendChild(marker);
      optTextWrapper.appendChild(txt);
      optDiv.appendChild(optTextWrapper);

      // Label Correct / Selected choices
      if (option.isCorrect) {
        optDiv.classList.add('correct-choice');
        const corBadge = document.createElement('span');
        corBadge.className = 'review-option-badge correct';
        corBadge.textContent = '정답';
        optDiv.appendChild(corBadge);
      } else if (userChoice === oIdx) {
        optDiv.classList.add('wrong-choice');
        const selBadge = document.createElement('span');
        selBadge.className = 'review-option-badge selected';
        selBadge.textContent = '선택함';
        optDiv.appendChild(selBadge);
      }

      optionsList.appendChild(optDiv);
    });

    // Rationales Box
    const rationaleBox = document.createElement('div');
    rationaleBox.className = 'review-rationales-box';
    
    const boxTitle = document.createElement('div');
    boxTitle.className = 'review-rationales-title';
    boxTitle.innerHTML = '<i class="fa-solid fa-circle-info"></i> 선택지 분석 해설';
    rationaleBox.appendChild(boxTitle);

    question.answerOptions.forEach((option, oIdx) => {
      const line = document.createElement('p');
      line.className = 'review-rationale-line';
      line.innerHTML = `<strong>[보기 ${oIdx + 1}]</strong> ${option.rationale}`;
      rationaleBox.appendChild(line);
    });

    // Assemble Card
    card.appendChild(header);
    card.appendChild(qText);
    card.appendChild(optionsList);
    card.appendChild(rationaleBox);

    dom.reviewList.appendChild(card);
  });

  // Set filter stats
  dom.filterCorrectCount.textContent = correctCount;
  dom.filterWrongCount.textContent = wrongCount;
  dom.filterFlaggedCount.textContent = flaggedCount;
}

function filterReviewList(filterType) {
  const cards = dom.reviewList.querySelectorAll('.review-item-card');
  cards.forEach(card => {
    const isCorrect = card.getAttribute('data-correct') === 'true';
    const isFlagged = card.getAttribute('data-flagged') === 'true';

    switch (filterType) {
      case 'correct':
        card.style.display = isCorrect ? 'block' : 'none';
        break;
      case 'wrong':
        card.style.display = !isCorrect ? 'block' : 'none';
        break;
      case 'flagged':
        card.style.display = isFlagged ? 'block' : 'none';
        break;
      default: // 'all'
        card.style.display = 'block';
    }
  });
}

/* ==========================================================================
   RESET & RETRY
   ========================================================================== */

function handleRestartApp() {
  playSound(dom.sndClick);
  // Reset filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
  
  // Return to Welcome Screen
  showScreen('welcome-screen');
}
