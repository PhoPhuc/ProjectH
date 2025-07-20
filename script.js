// --- Hàm Helper: Ngẫu nhiên hóa mảng (Fisher-Yates Shuffle) ---
function shuffleArray(array) {
    const shuffledArray = [...array]; // Tạo bản sao để không thay đổi mảng gốc
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]; // Hoán đổi vị trí
    }
    return shuffledArray;
}

// --- Code chính của ứng dụng Quiz ---
document.addEventListener('DOMContentLoaded', () => {
    // Áp dụng dark mode ngay khi trang tải (trước khi tạo các section)
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    // --- Tham chiếu DOM ---
    const appContainer = document.getElementById('app-container');
    const screens = {
        subjectSelection: document.getElementById('subject-selection-screen'),
        quizList: document.getElementById('quiz-list-screen'),
        info: document.getElementById('info-screen'),
        quiz: document.getElementById('quiz-section'),
    };
    const subjectListContainer = document.getElementById('subject-list');
    const quizListContainer = document.getElementById('quiz-list');
    const quizListTitle = document.getElementById('quiz-list-title')?.querySelector('span');
    const backToSubjectsBtn = document.getElementById('back-to-subjects-btn');
    const backToQuizListBtn = document.getElementById('back-to-quiz-list-btn');
    const backToListAfterResultBtn = document.getElementById('back-to-list-after-result-btn');
    const infoQuizTitle = document.getElementById('quiz-title');
    const infoTotalQuestions = document.getElementById('info-total-questions');
    const infoTimeLimit = document.getElementById('info-time-limit');
    const startBtn = document.getElementById('start-btn');

    const quizToolbar = document.getElementById('quiz-toolbar');
    const backToQuizListFromQuizBtn = document.getElementById('back-to-quiz-list-from-quiz-btn');
    const submitButtonToolbar = document.getElementById('submit-btn-toolbar');

    const timerContainer = document.getElementById('timer-container');
    const timeLeftElement = document.getElementById('time-left');
    const quizContentContainer = document.getElementById('quiz');
    const submitButton = document.getElementById('submit-btn');
    const retryButton = document.getElementById('retry-btn');
    const scoreContainer = document.getElementById('score-container');
    const filterContainer = document.getElementById('filter-container');
    const resultContainer = document.getElementById('result-container');

    const multiFunctionButton = document.getElementById('multi-function-button');
    const multiFunctionMenu = document.getElementById('multi-function-menu');

    // --- Trạng thái ứng dụng ---
    let currentView = 'subjectSelection';
    let selectedSubjectSlug = null;
    let currentSubjectData = null;
    let selectedQuizData = null;
    let timerIntervalId = null;
    let remainingTime = 0;
    let shuffledQuizQuestions = [];

    // --- Danh sách các môn học có sẵn ---
    const availableSubjects = {
        'vat-li': { name: 'Vật lí', icon: 'ph-atom' },
        'hoa-hoc': { name: 'Hoá học', icon: 'ph-flask' },
        'lich-su': { name: 'Lịch sử', icon: 'ph-scroll' },
        'sinh-hoc': { name: 'Sinh học', icon: 'ph-dna' },
        'tin-hoc': { name: 'Tin học', icon: 'ph-laptop' }
    };

    // --- Biến toàn cục cho Countdown ---
    let currentCountdownTargetDate = null; // Lưu trữ đối tượng Date của môn thi tiếp theo
    let examCountdownInterval = null;
    const countdownEl = document.getElementById('countdown');
    const messageEl = document.getElementById('message'); // Tin nhắn phụ dưới bộ đếm (ví dụ: "Chúc bạn thi tốt")
    const countdownTitleEl = document.getElementById('countdown-title'); // Tiêu đề của bộ đếm

    // Lưu trữ giá trị trước đó của các chữ số countdown để tạo hiệu ứng
    let prevCountdownValues = {
        'days-tens': -1, 'days-units': -1, 'hours-tens': -1, 'hours-units': -1,
        'minutes-tens': -1, 'minutes-units': -1, 'seconds-tens': -1, 'seconds-units': -1,
    };


    // --- Hàm điều hướng màn hình ---
    function navigateTo(screenId) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        if (screens[screenId]) {
            screens[screenId].classList.add('active');
            currentView = screenId;
            window.scrollTo(0, 0);
        } else {
            console.error("Screen ID not found:", screenId);
        }
    }

    // --- Hàm tạo thẻ môn học ---
    function createSubjectCard(subjectSlug, subjectInfo) {
        const card = document.createElement('div');
        card.classList.add('subject-card');
        card.dataset.subject = subjectSlug;
        card.innerHTML = `<i class="ph ${subjectInfo.icon || 'ph-book-open'}"></i><h3>${subjectInfo.name}</h3>`;
        card.addEventListener('click', () => {
            selectedSubjectSlug = subjectSlug;
            displayQuizList(subjectSlug);
        });
        return card;
    }

    // --- Hàm hiển thị danh sách môn học ---
    function displaySubjectSelection() {
        if (!subjectListContainer) {
            console.error("Lỗi: Không tìm thấy phần tử #subject-list trong HTML.");
            return;
        }
        subjectListContainer.innerHTML = '';
        for (const slug in availableSubjects) {
            const subjectInfo = availableSubjects[slug];
            const card = createSubjectCard(slug, subjectInfo);
            subjectListContainer.appendChild(card);
        }
        navigateTo('subjectSelection');
    }

    // --- Hàm tạo mục bài thi trong danh sách ---
    function createQuizListItem(quiz) {
        const listItem = document.createElement('div');
        listItem.classList.add('quiz-list-item');
        listItem.dataset.quizId = quiz.id;
        listItem.innerHTML = `<span>${quiz.title}</span><i class="ph ph-caret-right"></i>`;

        listItem.addEventListener('click', (event) => {
            // Ngăn chặn click nhiều lần
            if (listItem.classList.contains('quiz-item-clicked')) {
                return;
            }
            
            // Thêm hiệu ứng khi nhấn
            listItem.classList.add('quiz-item-clicked');
            
            // Tạo hiệu ứng ripple
            const ripple = document.createElement('div');
            ripple.classList.add('quiz-ripple');
            listItem.appendChild(ripple);
            
            // Lấy vị trí click để tạo hiệu ứng ripple
            const rect = listItem.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            // Xóa ripple sau khi animation hoàn thành
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 600);
            
            // Delay trước khi chuyển trang để hiển thị hiệu ứng
            setTimeout(() => {
            const clickedQuizData = currentSubjectData?.quizzes.find(q => q.id === quiz.id);
            if (clickedQuizData && clickedQuizData.redirectUrl) {
                window.location.href = clickedQuizData.redirectUrl;
            } else if (clickedQuizData) {
                selectedQuizData = clickedQuizData;
                displayQuizInfo();
            } else {
                displayQuizList(selectedSubjectSlug);
            }
            }, 400); // Tăng delay lên 400ms để hiệu ứng rõ ràng hơn
        });
        return listItem;
    }

    // --- Hàm hiển thị danh sách bài thi theo môn (Async) ---
    async function displayQuizList(subjectSlug) {
        if (!quizListContainer) return;
        quizListContainer.innerHTML = '<p>Đang tải danh sách bài thi...</p>';
        if (quizListTitle) {
             const subjectInfo = availableSubjects[subjectSlug];
             quizListTitle.textContent = subjectInfo?.name || '...';
        }

        try {
            const subjectModule = await import(`./data/${subjectSlug}.js`);
            currentSubjectData = subjectModule.default;

            if (!currentSubjectData || !currentSubjectData.quizzes) {
                quizListContainer.innerHTML = '<p>Không thể tải dữ liệu bài thi.</p>';
                navigateTo('quizList');
                return;
            }
            if (quizListTitle) quizListTitle.textContent = currentSubjectData.subjectName;

            quizListContainer.innerHTML = '';
            if (currentSubjectData.quizzes.length > 0) {
                currentSubjectData.quizzes.forEach(quiz => {
                    quizListContainer.appendChild(createQuizListItem(quiz));
                });
            } else {
                quizListContainer.innerHTML = '<p>Chưa có bài thi nào.</p>';
            }
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu môn học:", subjectSlug, error);
            quizListContainer.innerHTML = '<p>Lỗi tải danh sách bài thi.</p>';
            currentSubjectData = null;
        }
        navigateTo('quizList');
    }

    // --- Hàm hiển thị thông tin bài thi ---
    function displayQuizInfo() {
        if (!selectedQuizData) {
            if (selectedSubjectSlug) displayQuizList(selectedSubjectSlug);
            else displaySubjectSelection();
            return;
        }
        if (infoQuizTitle) infoQuizTitle.textContent = selectedQuizData.title;
        if (infoTotalQuestions) infoTotalQuestions.textContent = selectedQuizData.questions.length;
        if (infoTimeLimit) infoTimeLimit.textContent = selectedQuizData.timeLimitMinutes;
        navigateTo('info');
    }

    // --- Các hàm tạo câu hỏi (MC, TF, Fill) ---
    function addImageToQuestionBlock(questionBlock, question) {
        if (question.imageUrl) {
            const imgElement = document.createElement('img');
            imgElement.src = question.imageUrl;
            imgElement.alt = "Hình ảnh câu hỏi";
            imgElement.classList.add('question-image');
            const questionTextElement = questionBlock.querySelector('.question-text');
            if (questionTextElement) {
                questionTextElement.parentNode.insertBefore(imgElement, questionTextElement.nextSibling);
            } else {
                questionBlock.prepend(imgElement);
            }
        }
    }
    function createMCQuestionBlock(question, index) {
        const questionBlock = document.createElement('div');
        questionBlock.classList.add('question-block');
        const questionText = document.createElement('p');
        questionText.classList.add('question-text');
        questionText.textContent = `Câu ${index + 1}. ${question.question}`;
        questionBlock.appendChild(questionText);
        addImageToQuestionBlock(questionBlock, question);
        const optionsDiv = document.createElement('div');
        optionsDiv.classList.add('options');
        question.options.forEach((option, optionIndex) => {
            const label = document.createElement('label');
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = `question-${index}`;
            radioInput.value = optionIndex;
            label.id = `q${index}_opt${optionIndex}`;
            label.appendChild(radioInput);
            label.appendChild(document.createTextNode(` ${option}`));
            optionsDiv.appendChild(label);
        });
        questionBlock.appendChild(optionsDiv);
        return questionBlock;
    }
    function createTFQuestionBlock(question, index) {
        const questionBlock = document.createElement('div');
        questionBlock.classList.add('question-block');
        const questionText = document.createElement('p');
        questionText.classList.add('question-text');
        questionText.textContent = `Câu ${index + 1}. ${question.question}`;
        questionBlock.appendChild(questionText);
        addImageToQuestionBlock(questionBlock, question);
        const statementsContainer = document.createElement('div');
        statementsContainer.classList.add('statements-container');
        question.statements.forEach((statement, subIndex) => {
            const label = document.createElement('label');
            const checkboxInput = document.createElement('input');
            checkboxInput.type = 'checkbox';
            checkboxInput.name = `question-${index}-statement-${subIndex}`;
            checkboxInput.value = subIndex;
            label.id = `q${index}_s${subIndex}`;
            label.appendChild(checkboxInput);
            label.appendChild(document.createTextNode(` ${statement.text}`));
            statementsContainer.appendChild(label);
        });
        questionBlock.appendChild(statementsContainer);
        return questionBlock;
    }
    function createFillQuestionBlock(question, index) {
        const questionBlock = document.createElement('div');
        questionBlock.classList.add('question-block');
        const questionText = document.createElement('p');
        questionText.classList.add('question-text');
        questionText.textContent = `Câu ${index + 1}. ${question.question}`;
        questionBlock.appendChild(questionText);
        addImageToQuestionBlock(questionBlock, question);
        const fillContainer = document.createElement('div');
        fillContainer.classList.add('fill-container');
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.classList.add('fill-input');
        inputElement.id = `question-${index}-input`;
        inputElement.placeholder = "Nhập câu trả lời của bạn...";
        fillContainer.appendChild(inputElement);
        questionBlock.appendChild(fillContainer);
        return questionBlock;
    }

    // --- Hàm hiển thị nội dung quiz ---
    function displayQuizContent(questionsArray) {
        if (!quizContentContainer) return;
        quizContentContainer.innerHTML = '';
        questionsArray.forEach((q, index) => {
            let questionBlock;
            if (q.type === 'mc') questionBlock = createMCQuestionBlock(q, index);
            else if (q.type === 'tf') questionBlock = createTFQuestionBlock(q, index);
            else if (q.type === 'fill') questionBlock = createFillQuestionBlock(q, index);
            if (questionBlock) quizContentContainer.appendChild(questionBlock);
        });
        if (resultContainer) { resultContainer.style.display = 'none'; resultContainer.innerHTML = ''; }
        if (scoreContainer) scoreContainer.style.display = 'none';
        if (filterContainer) filterContainer.style.display = 'none';
        if (retryButton) retryButton.style.display = 'none';
        if (backToListAfterResultBtn) backToListAfterResultBtn.style.display = 'inline-block'; // Should be none initially
        if (submitButton) submitButton.style.display = 'inline-block';
        if (submitButtonToolbar) submitButtonToolbar.style.display = 'inline-block';
    }

    // --- Logic Timer (Bài thi) ---
    function startTimer(durationMinutes) {
        if (timerIntervalId) clearInterval(timerIntervalId);
        if (!timeLeftElement) return;
        remainingTime = durationMinutes * 60;
        updateTimerDisplay();
        timerIntervalId = setInterval(() => {
            remainingTime--;
            updateTimerDisplay();
            if (remainingTime <= 0) handleTimeUp();
        }, 1000);
    }
    function updateTimerDisplay() {
        if (!timeLeftElement || !timerContainer) return;
        if (remainingTime < 0) remainingTime = 0;
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        timeLeftElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        if (remainingTime <= 60 && remainingTime > 0) {
            timerContainer.style.backgroundColor = 'var(--incorrect-option-bg)';
            timerContainer.style.borderColor = 'var(--incorrect-color)';
            timerContainer.style.color = 'var(--incorrect-color)';
        } else {
            timerContainer.style.backgroundColor = 'var(--timer-bg)';
            timerContainer.style.borderColor = 'var(--timer-border)';
            timerContainer.style.color = 'var(--timer-text)';
        }
    }
    function handleTimeUp() {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        alert("Đã hết thời gian làm bài! Bài thi sẽ được nộp tự động.");
        calculateAndDisplayScore(true);
    }

    // --- Logic Tính điểm ---
    // ... (calculateMCQuestionScore, calculateTFQuestionScore, calculateFillQuestionScore - không thay đổi)
    function calculateMCQuestionScore(question, index, pointsPerMainQuestion) {
        const resultP = document.createElement('p');
        resultP.innerHTML = `<strong>Câu ${index + 1} (Trắc nghiệm):</strong> ${question.question}<br>`;
        if (question.imageUrl) {
             const imgElement = document.createElement('img');
             imgElement.src = question.imageUrl;
             imgElement.alt = "Hình ảnh câu hỏi";
             imgElement.classList.add('question-image-result');
             resultP.appendChild(imgElement);
        }
        const selectedOptionInput = quizContentContainer.querySelector(`input[name="question-${index}"]:checked`);
        const allOptionsInputs = quizContentContainer.querySelectorAll(`input[name="question-${index}"]`);
        const shuffledOptions = question.options;
        const newCorrectAnswerIndex = question.correctAnswer;
        let userAnswerIndex = -1;
        let questionPoints = 0;
        let isQuestionCorrect = false;

        allOptionsInputs.forEach((input, optIndex) => {
            input.disabled = true;
            const label = input.closest('label');
            if(label){
                if (optIndex === newCorrectAnswerIndex) label.classList.add('correct-option');
                if (input.checked) {
                    userAnswerIndex = parseInt(input.value);
                    if (userAnswerIndex !== newCorrectAnswerIndex) label.classList.add('incorrect-option');
                }
            }
        });

        if (userAnswerIndex !== -1) {
            const correctAnswerText = shuffledOptions[newCorrectAnswerIndex];
            const userAnswerText = shuffledOptions[userAnswerIndex];
            resultP.innerHTML += `&nbsp;&nbsp;Bạn chọn: <span class="user-answer">${userAnswerText}</span>. `;
            if (userAnswerIndex === newCorrectAnswerIndex) {
                questionPoints = pointsPerMainQuestion;
                isQuestionCorrect = true;
                resultP.innerHTML += `<span class="correct">Đúng!</span>`;
            } else {
                isQuestionCorrect = false;
                resultP.innerHTML += `&nbsp;&nbsp;<span class="incorrect">Sai.</span> Đáp án đúng là: <span class="correct">${correctAnswerText}</span>`;
            }
        } else {
            isQuestionCorrect = false;
            const correctAnswerText = shuffledOptions[newCorrectAnswerIndex];
            resultP.innerHTML += `&nbsp;&nbsp;<span class="incorrect">Bạn chưa trả lời.</span> Đáp án đúng là: <span class="correct">${correctAnswerText}</span>`;
        }
        resultP.dataset.correctness = isQuestionCorrect ? 'correct' : 'incorrect';
        return { element: resultP, points: questionPoints, isCorrect: isQuestionCorrect };
    }

    function calculateTFQuestionScore(question, index, pointsPerMainQuestion) {
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `<strong>Câu ${index + 1} (Đúng/Sai):</strong> ${question.question}<br>`;
         if (question.imageUrl) {
              const imgElement = document.createElement('img');
              imgElement.src = question.imageUrl;
              imgElement.alt = "Hình ảnh câu hỏi";
              imgElement.classList.add('question-image-result');
              resultDiv.appendChild(imgElement);
         }
        let pointsForThisTF = 0;
        const totalStatements = question.statements.length;
        const pointsPerStatement = totalStatements > 0 ? (pointsPerMainQuestion / totalStatements) : 0;
        let allStatementsCorrectForFilter = true;

        question.statements.forEach((statement, subIndex) => {
            const statementResultDiv = document.createElement('div');
            statementResultDiv.classList.add('statement-result-item');
            statementResultDiv.innerHTML = `&nbsp;&nbsp;- ${statement.text}: `;
            const checkboxInput = quizContentContainer.querySelector(`input[name="question-${index}-statement-${subIndex}"][type="checkbox"]`);
            const label = checkboxInput?.closest('label');

            if (checkboxInput) {
                checkboxInput.disabled = true;
                const isChecked = checkboxInput.checked;
                const correctAnswerBool = statement.correctAnswer;
                let isStatementAnswerCorrect = false;
                if (correctAnswerBool === true) {
                    if (isChecked) {
                        isStatementAnswerCorrect = true;
                        pointsForThisTF += pointsPerStatement;
                        statementResultDiv.innerHTML += `Bạn chọn <span class="user-answer">Đã chọn</span>. <span class="correct">Chính xác!</span>`;
                         if (label) label.classList.add('correct-option');
                    } else {
                        isStatementAnswerCorrect = false;
                        statementResultDiv.innerHTML += `Bạn chọn <span class="user-answer">Chưa chọn</span>. <span class="incorrect">Sai.</span> Đáp án là: <span class="correct">Đúng</span>`;
                         if (label) label.classList.add('incorrect-option');
                    }
                } else { // correctAnswerBool === false
                    if (!isChecked) {
                        isStatementAnswerCorrect = true;
                        pointsForThisTF += pointsPerStatement;
                        statementResultDiv.innerHTML += `Bạn chọn <span class="user-answer">Chưa chọn</span>. <span class="correct">Chính xác!</span>`;
                    } else {
                        isStatementAnswerCorrect = false;
                        statementResultDiv.innerHTML += `Bạn chọn <span class="user-answer">Đã chọn</span>. <span class="incorrect">Sai.</span> Đáp án là: <span class="correct">Sai</span>`;
                         if (label) label.classList.add('incorrect-option');
                    }
                }
                if (!isStatementAnswerCorrect) allStatementsCorrectForFilter = false;
            } else {
                 allStatementsCorrectForFilter = false;
                 statementResultDiv.innerHTML += `<span class="incorrect">Lỗi: Không tìm thấy input.</span>`;
            }
            resultDiv.appendChild(statementResultDiv);
        });
        const questionPoints = pointsForThisTF;
        resultDiv.dataset.correctness = allStatementsCorrectForFilter ? 'correct' : 'incorrect';
        return { element: resultDiv, points: questionPoints, isCorrect: allStatementsCorrectForFilter };
    }

    function calculateFillQuestionScore(question, index, pointsPerMainQuestion) {
        const resultP = document.createElement('p');
        resultP.innerHTML = `<strong>Câu ${index + 1} (Điền từ):</strong> ${question.question}<br>`;
         if (question.imageUrl) {
              const imgElement = document.createElement('img');
              imgElement.src = question.imageUrl;
              imgElement.alt = "Hình ảnh câu hỏi";
              imgElement.classList.add('question-image-result');
              resultP.appendChild(imgElement);
         }
        const inputElement = quizContentContainer.querySelector(`#question-${index}-input`);
        let userAnswer = '';
        let normalizedUserAnswer = '';
        if (inputElement) {
            inputElement.disabled = true;
            userAnswer = inputElement.value;
            normalizedUserAnswer = userAnswer.trim().toLowerCase();
        }
        let isMatch = false;
        let displayCorrectAnswer = '';
        let questionPoints = 0;
        let isQuestionCorrect = false;
        if (Array.isArray(question.correctAnswer)) {
            displayCorrectAnswer = question.correctAnswer.join(' hoặc ');
            isMatch = question.correctAnswer.some(ans => ans.trim().toLowerCase() === normalizedUserAnswer);
        } else {
            displayCorrectAnswer = question.correctAnswer;
            isMatch = (displayCorrectAnswer.trim().toLowerCase() === normalizedUserAnswer);
        }
        resultP.innerHTML += `&nbsp;&nbsp;Bạn đã điền: <span class="user-answer">${userAnswer || '(chưa điền)'}</span>. `;
        if (isMatch) {
            questionPoints = pointsPerMainQuestion;
            isQuestionCorrect = true;
            resultP.innerHTML += `<span class="correct">Đúng!</span>`;
             if (inputElement) inputElement.classList.add('correct-option');
        } else {
            isQuestionCorrect = false;
            resultP.innerHTML += `&nbsp;&nbsp;<span class="incorrect">Sai.</span> Đáp án đúng là: <span class="correct">${displayCorrectAnswer}</span>`;
            if (inputElement) inputElement.classList.add('incorrect-option');
        }
        resultP.dataset.correctness = isQuestionCorrect ? 'correct' : 'incorrect';
        return { element: resultP, points: questionPoints, isCorrect: isQuestionCorrect };
    }
    function calculateAndDisplayScore(isAutoSubmit = false) {
        if (!selectedQuizData) return;
        if (timerIntervalId) { clearInterval(timerIntervalId); timerIntervalId = null; }
        let totalScore = 0;
        if (!resultContainer) return;
        resultContainer.innerHTML = '';
        const currentQuestions = shuffledQuizQuestions;
        const totalMainQuestions = currentQuestions.length;
        const pointsPerMainQuestion = totalMainQuestions > 0 ? (10 / totalMainQuestions) : 0;

        currentQuestions.forEach((q, index) => {
            let scoreResult;
            if (q.type === 'mc') scoreResult = calculateMCQuestionScore(q, index, pointsPerMainQuestion);
            else if (q.type === 'tf') scoreResult = calculateTFQuestionScore(q, index, pointsPerMainQuestion);
            else if (q.type === 'fill') scoreResult = calculateFillQuestionScore(q, index, pointsPerMainQuestion);
            if (scoreResult) {
                resultContainer.appendChild(scoreResult.element);
                totalScore += scoreResult.points;
            }
        });
        const finalScoreRounded = totalScore.toFixed(2);
        if (scoreContainer) {
            scoreContainer.innerHTML = `Kết quả: <strong style="font-size: 1.1em;">Điểm: ${finalScoreRounded} / 10</strong>`;
            scoreContainer.style.display = 'block';
        }
        if (filterContainer) filterContainer.style.display = 'block';
        if (resultContainer) resultContainer.style.display = 'block';
        if (submitButtonToolbar) submitButtonToolbar.style.display = 'none';
        if (submitButton) submitButton.style.display = 'none';
        if (retryButton) retryButton.style.display = 'inline-block';
        if (backToListAfterResultBtn) backToListAfterResultBtn.style.display = 'inline-block';
        if (filterContainer) {
            applyFilter('all');
            filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.filter === 'all') btn.classList.add('active');
            });
        }
        if (!isAutoSubmit && resultContainer) {
            resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // --- Logic Lọc kết quả ---
    function applyFilter(filterType) {
        if (!resultContainer) return;
        const resultItems = resultContainer.querySelectorAll('p[data-correctness], div[data-correctness]');
        resultItems.forEach(item => {
            const correctness = item.dataset.correctness;
            item.classList.remove('hidden-result');
            if (filterType === 'correct' && correctness !== 'correct') {
                item.classList.add('hidden-result');
            } else if (filterType === 'incorrect' && correctness === 'correct') {
                item.classList.add('hidden-result');
            }
        });
    }

    // --- Logic Xử lý nút ---
    function handleRetryQuiz() {
        if (timerIntervalId) { clearInterval(timerIntervalId); timerIntervalId = null; }
        if (selectedSubjectSlug) displayQuizList(selectedSubjectSlug);
        else displaySubjectSelection();
        shuffledQuizQuestions = [];
        selectedQuizData = null;
        currentSubjectData = null;
    }
    function handleStartQuiz() {
        if (!selectedQuizData) return;
        const mcQuestions = selectedQuizData.questions.filter(q => q.type === 'mc');
        const tfQuestions = selectedQuizData.questions.filter(q => q.type === 'tf');
        const fillQuestions = selectedQuizData.questions.filter(q => q.type === 'fill');
        const shuffledMc = shuffleArray(mcQuestions);
        const shuffledTf = shuffleArray(tfQuestions);
        const shuffledFill = shuffleArray(fillQuestions);
        shuffledQuizQuestions = shuffledMc.concat(shuffledTf, shuffledFill);
        shuffledQuizQuestions = shuffledQuizQuestions.map(q => {
            if (q.type === 'mc') {
                const originalOptions = q.options;
                const originalCorrectAnswerIndex = q.correctAnswer;
                const correctAnswerText = originalOptions[originalCorrectAnswerIndex];
                const shuffledOptions = shuffleArray(originalOptions);
                const newCorrectAnswerIndex = shuffledOptions.indexOf(correctAnswerText);
                return { ...q, options: shuffledOptions, correctAnswer: newCorrectAnswerIndex };
            }
            return q;
        });
        displayQuizContent(shuffledQuizQuestions);
        if (selectedQuizData.timeLimitMinutes > 0) {
            startTimer(selectedQuizData.timeLimitMinutes);
            if (timerContainer) timerContainer.style.display = 'inline-flex';
        } else {
            if (timerContainer) timerContainer.style.display = 'none';
        }
        if (submitButton) submitButton.style.display = 'inline-block';
        if (submitButtonToolbar) submitButtonToolbar.style.display = 'inline-block';
        navigateTo('quiz');
    }

    // --- LOGIC BỘ ĐẾM NGƯỢC NGÀY THI (COUNTDOWN) ---
    function updateDigit(elementId, newDigit) {
        const prevDigit = prevCountdownValues[elementId];
        if (newDigit !== prevDigit) {
            const currentElement = document.getElementById(elementId);
            if (!currentElement) return;
            currentElement.style.transform = 'translateY(100%)';
            currentElement.style.transition = 'transform 0.4s ease-in-out';
            currentElement.addEventListener('transitionend', function handler() {
                currentElement.removeEventListener('transitionend', handler);
                currentElement.textContent = newDigit;
                currentElement.style.transition = 'none';
                currentElement.style.transform = 'translateY(-100%)';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        currentElement.style.transition = 'transform 0.4s ease-in-out';
                        currentElement.style.transform = 'translateY(0)';
                    });
                });
            });
            prevCountdownValues[elementId] = newDigit;
        }
    }

    function startOrUpdateGlobalCountdown() {
        if (examCountdownInterval) {
            clearInterval(examCountdownInterval);
            examCountdownInterval = null;
        }

        if (currentCountdownTargetDate && currentCountdownTargetDate.getTime() > new Date().getTime()) {
            if (countdownEl) countdownEl.style.display = 'flex';
            if (messageEl) messageEl.textContent = ''; // Xóa tin nhắn chung

            initializeExamCountdownDisplay(); // Sử dụng currentCountdownTargetDate toàn cục
            examCountdownInterval = setInterval(updateExamCountdown, 1000); // Sử dụng currentCountdownTargetDate toàn cục
        } else {
            // Không có ngày mục tiêu hợp lệ trong tương lai
            if (countdownEl) countdownEl.style.display = 'none';
            // countdownTitleEl đã được cập nhật bởi displayExamSchedule
            Object.keys(prevCountdownValues).forEach(id => updateDigit(id, '0')); // Reset các chữ số
            if (messageEl && currentView === 'subjectSelection') { // Chỉ hiển thị tin nhắn "chúc thi tốt" nếu không có môn nào sắp tới
                 if (currentCountdownTargetDate === null && document.getElementById('all-exams-passed-message')?.style.display !== 'none') {
                    // messageEl.textContent = "Tất cả các môn thi đã kết thúc."; // Tiêu đề đã xử lý
                 } else if (currentCountdownTargetDate === null && document.getElementById('no-upcoming-message')?.style.display !== 'none') {
                    // messageEl.textContent = "Hiện tại không có lịch thi nào sắp tới."; // Tiêu đề đã xử lý
                 } else if (currentCountdownTargetDate && currentCountdownTargetDate.getTime() <= new Date().getTime()){
                    // messageEl.textContent = "Chúc bạn thi tốt!"; // Môn thi vừa qua
                 }
            }
        }
    }

    function initializeExamCountdownDisplay() {
        if (!currentCountdownTargetDate) {
            Object.keys(prevCountdownValues).forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = '0';
                prevCountdownValues[id] = 0;
            });
            if (countdownEl) countdownEl.style.display = 'none';
            return;
        }

        const now = new Date().getTime();
        const targetTime = currentCountdownTargetDate.getTime();
        const distance = targetTime - now > 0 ? targetTime - now : 0;

        if (distance <= 0) {
            Object.keys(prevCountdownValues).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '0';
                prevCountdownValues[id] = 0;
            });
            if (countdownEl) countdownEl.style.display = 'none';
            return;
        }
        if (countdownEl) countdownEl.style.display = 'flex';

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        const initialTimeValues = {
            'days-tens': Math.floor(days / 10), 'days-units': days % 10,
            'hours-tens': Math.floor(hours / 10), 'hours-units': hours % 10,
            'minutes-tens': Math.floor(minutes / 10), 'minutes-units': minutes % 10,
            'seconds-tens': Math.floor(seconds / 10), 'seconds-units': seconds % 10,
        };
        for (const id in initialTimeValues) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = initialTimeValues[id]; // Đặt trực tiếp khi khởi tạo
                prevCountdownValues[id] = initialTimeValues[id];
            }
        }
    }

    function updateExamCountdown() {
        if (!currentCountdownTargetDate) {
            if (examCountdownInterval) clearInterval(examCountdownInterval);
            examCountdownInterval = null;
            if (countdownEl) countdownEl.style.display = 'none';
            return;
        }

        const now = new Date().getTime();
        const distance = currentCountdownTargetDate.getTime() - now;

        if (distance < 0) {
            // Thời gian thi đã qua. displayExamSchedule sẽ tìm mục tiêu tiếp theo hoặc hiển thị "tất cả đã qua".
            // Nó cũng sẽ gọi startOrUpdateGlobalCountdown để xóa interval cũ.
            displayExamSchedule();
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        updateDigit('days-tens', Math.floor(days / 10)); updateDigit('days-units', days % 10);
        updateDigit('hours-tens', Math.floor(hours / 10)); updateDigit('hours-units', hours % 10);
        updateDigit('minutes-tens', Math.floor(minutes / 10)); updateDigit('minutes-units', minutes % 10);
        updateDigit('seconds-tens', Math.floor(seconds / 10)); updateDigit('seconds-units', seconds % 10);
    }
    // --- KẾT THÚC LOGIC BỘ ĐẾM NGƯỢC NGÀY THI ---


    // --- LOGIC BẢNG LỊCH THI ---
    function displayExamSchedule() {
        const exams = [ // Dữ liệu lịch thi
            { ngayThi: "12/05/2025", monThi: "Văn", thoiGianBatDau: "7g20", thoiGianLamBai: "90 phút" },
            { ngayThi: "12/05/2025", monThi: "Vật lý", thoiGianBatDau: "9h00", thoiGianLamBai: "45 phút" },
            { ngayThi: "13/05/2025", monThi: "Toán", thoiGianBatDau: "7g20", thoiGianLamBai: "90 phút" },
            { ngayThi: "13/05/2025", monThi: "Sinh", thoiGianBatDau: "9h00", thoiGianLamBai: "45 phút" },
            { ngayThi: "14/05/2025", monThi: "Lịch sử", thoiGianBatDau: "7g20", thoiGianLamBai: "45 phút" },
            { ngayThi: "14/05/2025", monThi: "Tiếng Anh", thoiGianBatDau: "8g15", thoiGianLamBai: "60 phút" },
            { ngayThi: "15/05/2025", monThi: "Hóa", thoiGianBatDau: "7g20", thoiGianLamBai: "45 phút" },
            { ngayThi: "15/05/2025", monThi: "Tin học", thoiGianBatDau: "8g20", thoiGianLamBai: "45 phút" }
        ];

        function parseDateTime(dateStr, timeStr) {
            const [day, month, year] = dateStr.split('/').map(Number);
            const normalizedTimeStr = timeStr.replace('g', ':').replace('h', ':');
            const timeParts = normalizedTimeStr.split(':').map(Number);
            const hours = timeParts[0];
            const minutes = timeParts.length > 1 ? timeParts[1] : 0;
            return new Date(year, month - 1, day, hours, minutes, 0);
        }

        function calculateEndTime(startTime, durationStr) {
            const durationMinutes = parseInt(durationStr.replace(' phút', ''));
            return new Date(startTime.getTime() + durationMinutes * 60000);
        }

        const processedExams = exams.map(exam => ({
            ...exam,
            dateTime: parseDateTime(exam.ngayThi, exam.thoiGianBatDau)
        })).sort((a, b) => a.dateTime - b.dateTime);

        const now = new Date();
        const tbody = document.getElementById('exam-schedule-body');
        const noUpcomingMessage = document.getElementById('no-upcoming-message');
        const allExamsPassedMessage = document.getElementById('all-exams-passed-message');

        if (!tbody || !noUpcomingMessage || !allExamsPassedMessage || !countdownTitleEl) {
            console.warn("Một số phần tử DOM cho lịch thi hoặc countdown không tìm thấy.");
            return;
        }
        tbody.innerHTML = '';

        // Xác định môn thi tiếp theo cho countdown và trạng thái chung
        let firstUpcomingExamForCountdown = null;
        for (const exam of processedExams) {
            if (exam.dateTime > now) {
                firstUpcomingExamForCountdown = exam;
                break;
            }
        }

        if (firstUpcomingExamForCountdown) {
            currentCountdownTargetDate = firstUpcomingExamForCountdown.dateTime;
            countdownTitleEl.textContent = `Thời gian còn lại đến môn thi tiếp theo:`;
        } else {
            currentCountdownTargetDate = null;
            if (processedExams.length > 0 && processedExams.every(exam => calculateEndTime(exam.dateTime, exam.thoiGianLamBai) < now)) {
                countdownTitleEl.textContent = "Tất cả các môn thi đã kết thúc.";
                 if (messageEl) messageEl.textContent = "Chúc bạn ôn tập tốt cho các kỳ thi sau!";
            } else if (processedExams.length === 0) {
                countdownTitleEl.textContent = "Không có lịch thi.";
                 if (messageEl) messageEl.textContent = "Vui lòng kiểm tra lại sau.";
            } else {
                // Trường hợp có môn thi nhưng không phải "sắp tới" và cũng không phải "tất cả đã qua"
                // (ví dụ: dữ liệu lỗi, hoặc một môn đang diễn ra)
                // Tìm môn đang diễn ra hoặc môn vừa kết thúc gần nhất để hiển thị thông báo phù hợp
                let lastExamToday = null;
                const todayExams = processedExams.filter(exam =>
                    exam.dateTime.getDate() === now.getDate() &&
                    exam.dateTime.getMonth() === now.getMonth() &&
                    exam.dateTime.getFullYear() === now.getFullYear()
                );
                if(todayExams.length > 0){
                    lastExamToday = todayExams.reduce((last, current) => {
                        return calculateEndTime(current.dateTime, current.thoiGianLamBai) > calculateEndTime(last.dateTime, last.thoiGianLamBai) ? current : last;
                    });
                }

                if (lastExamToday && lastExamToday.dateTime <= now && calculateEndTime(lastExamToday.dateTime, lastExamToday.thoiGianLamBai) >= now) {
                    countdownTitleEl.textContent = `Môn ${lastExamToday.monThi} đang diễn ra!`;
                } else {
                     countdownTitleEl.textContent = "Lịch thi chưa được cập nhật chính xác.";
                }
                 if (messageEl) messageEl.textContent = "";
            }
        }
        startOrUpdateGlobalCountdown(); // Khởi động hoặc cập nhật bộ đếm toàn cục


        // Hiển thị bảng lịch thi và các tin nhắn
        let nextExamDayForHighlight = null;
        if (firstUpcomingExamForCountdown) {
            nextExamDayForHighlight = firstUpcomingExamForCountdown.ngayThi;
        }


        let allPassedCheck = true;
        if (processedExams.length > 0) {
            processedExams.forEach(exam => {
                if (calculateEndTime(exam.dateTime, exam.thoiGianLamBai) > now) {
                    allPassedCheck = false;
                }
                const row = document.createElement('tr');
                row.classList.add('bg-white');
                const cellClasses = ['py-3', 'px-2', 'md:px-4', 'text-sm', 'md:text-base', 'align-middle', 'md:whitespace-nowrap'];
                const examEndTime = calculateEndTime(exam.dateTime, exam.thoiGianLamBai);

                if (examEndTime < now) {
                    row.classList.add('exam-row-passed');
                } else if (exam.ngayThi === nextExamDayForHighlight) {
                    row.classList.remove('bg-white');
                    row.classList.add('exam-row-next-day');
                } else {
                    row.classList.add('exam-row-upcoming');
                }
                row.classList.add('hover:bg-gray-50', 'transition-colors', 'duration-150');
                row.innerHTML = `
                    <td class="${cellClasses.join(' ')}">${exam.ngayThi}</td>
                    <td class="${cellClasses.join(' ')}">${exam.monThi}</td>
                    <td class="${cellClasses.join(' ')}">${exam.thoiGianBatDau.replace('g', 'h')}</td>
                    <td class="${cellClasses.join(' ')}">${exam.thoiGianLamBai}</td>
                `;
                tbody.appendChild(row);
            });
        }


        if (processedExams.length === 0) {
            noUpcomingMessage.style.display = 'block';
            allExamsPassedMessage.style.display = 'none';
        } else if (allPassedCheck) {
            allExamsPassedMessage.style.display = 'block';
            noUpcomingMessage.style.display = 'none';
        } else if (!firstUpcomingExamForCountdown && !allPassedCheck) {
            // Có exam nhưng không có exam nào sắp tới và cũng không phải tất cả đã qua (ví dụ đang diễn ra)
            noUpcomingMessage.style.display = 'none'; // Hoặc một tin nhắn khác
            allExamsPassedMessage.style.display = 'none';
        }
        else {
            noUpcomingMessage.style.display = 'none';
            allExamsPassedMessage.style.display = 'none';
        }
    }
    // --- KẾT THÚC LOGIC BẢNG LỊCH THI ---

    // --- Gắn sự kiện ---
    if (startBtn) startBtn.addEventListener('click', handleStartQuiz);
    if (submitButtonToolbar) submitButtonToolbar.addEventListener('click', () => calculateAndDisplayScore(false));
    if (submitButton) submitButton.addEventListener('click', () => calculateAndDisplayScore(false));
    if (retryButton) retryButton.addEventListener('click', handleRetryQuiz);
    if (backToListAfterResultBtn) backToListAfterResultBtn.addEventListener('click', handleRetryQuiz);

    if (backToSubjectsBtn) backToSubjectsBtn.addEventListener('click', () => {
        if (timerIntervalId) clearInterval(timerIntervalId); timerIntervalId = null;
        shuffledQuizQuestions = []; selectedQuizData = null; currentSubjectData = null;
        displaySubjectSelection();
    });
    if (backToQuizListBtn) backToQuizListBtn.addEventListener('click', () => {
        if (timerIntervalId) clearInterval(timerIntervalId); timerIntervalId = null;
        shuffledQuizQuestions = []; selectedQuizData = null;
        if (selectedSubjectSlug && currentSubjectData) displayQuizListFromData(currentSubjectData);
        else displaySubjectSelection();
    });
    if (backToQuizListFromQuizBtn) backToQuizListFromQuizBtn.addEventListener('click', () => {
        if (timerIntervalId) clearInterval(timerIntervalId); timerIntervalId = null;
        shuffledQuizQuestions = []; selectedQuizData = null;
        if (selectedSubjectSlug && currentSubjectData) displayQuizListFromData(currentSubjectData);
        else displaySubjectSelection();
    });

    function displayQuizListFromData(subjectData) {
        if (!quizListContainer || !subjectData || !subjectData.quizzes) {
            displaySubjectSelection(); return;
        }
        if (quizListTitle) quizListTitle.textContent = subjectData.subjectName;
        quizListContainer.innerHTML = '';
        if (subjectData.quizzes.length > 0) {
            subjectData.quizzes.forEach(quiz => quizListContainer.appendChild(createQuizListItem(quiz)));
        } else {
            quizListContainer.innerHTML = '<p>Chưa có bài thi nào.</p>';
        }
        navigateTo('quizList');
    }

    if (filterContainer) {
        filterContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('filter-btn')) {
                const filterType = event.target.dataset.filter;
                filterContainer.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                applyFilter(filterType);
            }
        });
    }



    // --- Navigation Bar Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const studySection = document.getElementById('subject-selection-screen');
    const utilitiesSection = document.createElement('div');
    utilitiesSection.id = 'utilities-section';
    utilitiesSection.className = 'screen';
    utilitiesSection.innerHTML = `
        <div class="screen-container">
            <h1>Tiện ích</h1>
            <p>Chọn tiện ích bạn muốn sử dụng:</p>
            <div class="utilities-grid">
                <div class="utility-card" id="dark-mode-toggle">
                    <i class="ph ph-moon"></i>
                    <h3>Dark Mode</h3>
                    <p>Chuyển đổi giao diện sáng/tối</p>
                    <div class="toggle-switch">
                        <input type="checkbox" id="dark-mode-checkbox">
                        <label for="dark-mode-checkbox"></label>
                    </div>
                </div>
                <div class="utility-card" id="calendar-utility">
                    <i class="ph ph-calendar"></i>
                    <h3>Lịch thi</h3>
                    <p>Xem lịch thi và đếm ngược thời gian</p>
                </div>
                <div class="utility-card">
                    <i class="ph ph-calculator"></i>
                    <h3>Máy tính</h3>
                    <p>Máy tính khoa học cho các phép tính phức tạp</p>
                </div>
                <div class="utility-card" id="clock-utility">
                    <i class="ph ph-brain"></i>
                    <h3>Tăng cường học tập</h3>
                    <p>Đồng hồ đếm ngược và phương pháp học tập</p>
                </div>
                <div class="utility-card">
                    <i class="ph ph-note-pencil"></i>
                    <h3>Ghi chú</h3>
                    <p>Ghi chú nhanh và lưu trữ</p>
                </div>
            </div>
        </div>
    `;

    // Tạo section lịch thi
    const calendarSection = document.createElement('div');
    calendarSection.id = 'calendar-section';
    calendarSection.className = 'screen';
    calendarSection.innerHTML = `
        <div class="screen-container">
            <button id="back-to-utilities-btn" class="back-button"><i class="ph ph-arrow-left"></i> Quay lại</button>
            <h1>Lịch thi</h1>
            <div id="countdown-container">
                <div id="countdown-title">Thời gian còn lại đến môn thi đầu tiên:</div>
                <div id="countdown">
                    <div class="time-unit">
                        <div class="digits">
                            <span class="digit-container"><span class="digit" id="days-tens">0</span></span>
                            <span class="digit-container"><span class="digit" id="days-units">0</span></span>
                        </div>
                        <span>Ngày</span>
                    </div>
                    <div class="time-unit">
                        <div class="digits">
                            <span class="digit-container"><span class="digit" id="hours-tens">0</span></span>
                            <span class="digit-container"><span class="digit" id="hours-units">0</span></span>
                        </div>
                        <span>Giờ</span>
                    </div>
                    <div class="time-unit">
                         <div class="digits">
                            <span class="digit-container"><span class="digit" id="minutes-tens">0</span></span>
                            <span class="digit-container"><span class="digit" id="minutes-units">0</span></span>
                         </div>
                        <span>Phút</span>
                    </div>
                    <div class="time-unit">
                         <div class="digits">
                            <span class="digit-container"><span class="digit" id="seconds-tens">0</span></span>
                            <span class="digit-container"><span class="digit" id="seconds-units">0</span></span>
                         </div>
                        <span>Giây</span>
                    </div>
                </div>
                <div id="message"></div>
            </div>
            <div id="exam-schedule-container" class="container mx-auto p-4 md:p-8 mt-10">
                <h2 class="text-2xl font-bold text-center text-blue-700 mb-6">Lịch thi</h2>
                <div class="overflow-x-auto bg-white shadow-xl rounded-lg">
                    <table class="min-w-full w-full table-auto">
                        <thead class="table-header-exam">
                            <tr>
                                <th class="py-3 px-2 md:px-4 uppercase font-semibold text-sm text-left whitespace-nowrap rounded-tl-lg">Ngày thi</th>
                                <th class="py-3 px-2 md:px-4 uppercase font-semibold text-sm text-left whitespace-nowrap">Môn thi</th>
                                <th class="py-3 px-2 md:px-4 uppercase font-semibold text-sm text-left whitespace-nowrap">Thời gian bắt đầu</th>
                                <th class="py-3 px-2 md:px-4 uppercase font-semibold text-sm text-left whitespace-nowrap rounded-tr-lg">Thời gian làm bài</th>
                            </tr>
                        </thead>
                        <tbody id="exam-schedule-body" class="divide-y divide-gray-200">
                        </tbody>
                    </table>
                </div>
                <p id="no-upcoming-message" class="text-center text-gray-600 mt-6 text-lg" style="display:none;">
                    Hiện tại không có lịch thi nào sắp tới hoặc không có dữ liệu.
                </p>
                <p id="all-exams-passed-message" class="text-center text-gray-600 mt-6 text-lg" style="display:none;">
                    Tất cả các môn thi trong lịch đã kết thúc.
                </p>
            </div>
        </div>
    `;

    // Tạo section đồng hồ
    const clockSection = document.createElement('div');
    clockSection.id = 'clock-section';
    clockSection.className = 'screen';
    clockSection.innerHTML = `
        <div class="screen-container">
            <button id="back-to-utilities-from-clock-btn" class="back-button"><i class="ph ph-arrow-left"></i> Quay lại</button>
            <h1><i class="ph ph-brain"></i> Tăng cường học tập</h1>
            
            <!-- Study Plan Generator Section -->
            <div class="study-plan-section">
                <h2>Tạo lịch học thông minh</h2>
                
                <!-- Method Selection -->
                <div class="method-selection-section">
                    <h3>Chọn phương pháp học tập</h3>
                    <div class="method-cards-grid" id="method-cards-grid">
                        <!-- Method cards will be populated here -->
                    </div>
                </div>

                <!-- Study Configuration -->
                <div class="study-config-section">
                    <h3>Cấu hình học tập</h3>
                    <div class="config-form">
                        <div class="form-group">
                            <label for="total-time">Tổng thời gian học (phút):</label>
                            <div class="time-input-container">
                                <input type="number" id="total-time" class="form-input" min="15" max="480" value="120" placeholder="Nhập thời gian (15-480 phút)">
                                <div class="time-presets">
                                    <button class="time-preset-btn" data-time="60">1 giờ</button>
                                    <button class="time-preset-btn" data-time="90">1.5 giờ</button>
                                    <button class="time-preset-btn" data-time="120">2 giờ</button>
                                    <button class="time-preset-btn" data-time="180">3 giờ</button>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="subject-input">Môn học cần học:</label>
                            <input type="text" id="subject-input" class="form-input" placeholder="Ví dụ: Toán, Văn, Anh...">
                        </div>
                        <button id="generate-plan-btn" class="generate-btn" disabled>
                            <i class="ph ph-play-circle"></i>
                            Tạo lịch học
                        </button>
                    </div>
                </div>
            </div>

            <!-- Generated Study Plan Section -->
            <div class="generated-plan-section" id="generated-plan-section" style="display: none;">
                <h2>Lịch học của bạn</h2>
                <div class="plan-summary" id="plan-summary">
                    <!-- Plan summary will be populated here -->
                </div>
                <div class="plan-timeline" id="plan-timeline">
                    <!-- Timeline will be populated here -->
                </div>
                <div class="plan-actions">
                    <button id="start-study-session-btn" class="start-session-btn">Bắt đầu học</button>
                    <button id="reset-plan-btn" class="reset-plan-btn">Tạo lịch mới</button>
                </div>
            </div>

            <!-- Timer Section -->
            <div class="timer-section" id="timer-section" style="display: none;">
                <div class="timer-header">
                    <h2><i class="ph ph-brain"></i> Phiên học hiện tại</h2>
                    <button id="exit-fullscreen-btn" class="exit-fullscreen-btn">
                        <i class="ph ph-x"></i>
                        Thoát
                    </button>
                </div>
                
                <div class="timer-main-content">
                    <div class="timer-display">
                        <div id="timer-time" class="timer-time">00:00</div>
                    </div>
                    
                    <div id="session-info" class="session-info">
                        <!-- Session info will be populated here -->
                    </div>
                    
                    <div id="session-progress" class="session-progress">
                        <!-- Progress will be shown here -->
                    </div>
                    
                    <div class="timer-controls">
                        <button id="start-timer" class="timer-btn">
                            <i class="ph ph-play"></i>
                            Bắt đầu
                        </button>
                        <button id="pause-timer" class="timer-btn" style="display: none;">
                            <i class="ph ph-pause"></i>
                            Tạm dừng
                        </button>
                        <button id="reset-timer" class="timer-btn">
                            <i class="ph ph-arrow-clockwise"></i>
                            Làm lại
                        </button>
                        <button id="next-session-btn" class="timer-btn" style="display: none;">
                            <i class="ph ph-arrow-right"></i>
                            Phiên tiếp theo
                        </button>
                    </div>
                </div>
                

            </div>


        </div>
    `;

    const infoSection = document.createElement('div');
    infoSection.id = 'info-section';
    infoSection.className = 'screen';
    infoSection.innerHTML = `
        <div class="screen-container">
            <h1>Thông tin</h1>
            <p>Thông tin và liên kết hữu ích:</p>
            <div class="info-grid">
                <a href="#" target="_blank" class="info-card">
                    <i class="ph ph-wrench"></i>
                    <h3>Coming soon...</h3>
                    <p>Tính năng mới đang được phát triển</p>
                </a>
                <a href="https://phophuc.github.io/back/" target="_blank" class="info-card">
                    <i class="ph ph-info"></i>
                    <h3>Lịch sử Quyên Góp</h3>
                    <p>Xem lịch sử quyên góp và hỗ trợ</p>
                </a>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSedlOhJ0by8MQIZFQ-aN-0D6iD5QF_fVuaKOJoQdqtN9Rhncw/viewform?usp=dialog" target="_blank" class="info-card">
                    <i class="ph ph-flag"></i>
                    <h3>Góp ý</h3>
                    <p>Báo cáo lỗi hoặc gửi yêu cầu tính năng</p>
                </a>
            </div>
        </div>
    `;

    // Thêm utilities section, calendar section, clock section và info section vào app container
    appContainer.appendChild(utilitiesSection);
    appContainer.appendChild(calendarSection);
    appContainer.appendChild(clockSection);
    appContainer.appendChild(infoSection);

    // Xử lý sự kiện click navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            
            // Cập nhật active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Ẩn tất cả sections
            studySection.classList.remove('active');
            utilitiesSection.classList.remove('active');
            calendarSection.classList.remove('active');
            clockSection.classList.remove('active');
            infoSection.classList.remove('active');
            
            // Hiển thị section được chọn
            if (section === 'study') {
                studySection.classList.add('active');
                // Dừng countdown khi chuyển sang study
                if (examCountdownInterval) {
                    clearInterval(examCountdownInterval);
                    examCountdownInterval = null;
                }
            } else if (section === 'utilities') {
                utilitiesSection.classList.add('active');
                // Dừng countdown khi chuyển sang utilities
                if (examCountdownInterval) {
                    clearInterval(examCountdownInterval);
                    examCountdownInterval = null;
                }
                // Khởi tạo lại dark mode khi chuyển sang utilities
                setTimeout(initializeDarkMode, 100);
            } else if (section === 'info') {
                infoSection.classList.add('active');
                // Dừng countdown khi chuyển sang info
                if (examCountdownInterval) {
                    clearInterval(examCountdownInterval);
                    examCountdownInterval = null;
                }
            }
        });
    });

    // Dữ liệu phương pháp học tập với thông tin tính toán
    const studyMethods = {
        "phuong_phap_hoc_tap_quan_ly_thoi_gian": [
            {
                "ten_phuong_phap": "Kỹ thuật Pomodoro",
                "mo_ta": "Chia nhỏ thời gian học tập thành các khoảng 25 phút tập trung cao độ, xen kẽ là 5 phút nghỉ ngắn. Sau mỗi 4 'Pomodoros', có một khoảng nghỉ dài hơn (15-30 phút).",
                "logic": "Tăng cường sự tập trung, giảm mệt mỏi, và cải thiện năng suất bằng cách chia nhỏ công việc và thiết lập các khoảng nghỉ đều đặn. Kích thích cảm giác hoàn thành và duy trì động lực.",
                "cach_hoc_ap_dung": [
                    "Chọn một nhiệm vụ cần thực hiện.",
                    "Đặt hẹn giờ 25 phút (1 Pomodoro).",
                    "Tập trung hoàn toàn vào nhiệm vụ cho đến khi hết giờ.",
                    "Nghỉ 5 phút.",
                    "Lặp lại quy trình. Sau 4 Pomodoros, nghỉ 15-30 phút."
                ],
                "tinh_toan": {
                    "session_time": 25,
                    "break_time": 5,
                    "long_break_time": 20,
                    "sessions_before_long_break": 4,
                    "description": "25 phút học + 5 phút nghỉ, sau 4 phiên nghỉ 20 phút"
                }
            },
            {
                "ten_phuong_phap": "Kỹ thuật Desktime",
                "mo_ta": "Học tập trong 52 phút tập trung cao độ, sau đó nghỉ 17 phút để não bộ có thời gian xử lý thông tin và phục hồi năng lượng.",
                "logic": "Dựa trên nghiên cứu về chu kỳ sinh học của não bộ, 52 phút là thời gian tối ưu để duy trì sự tập trung cao độ, và 17 phút nghỉ ngơi giúp não bộ xử lý thông tin hiệu quả.",
                "cach_hoc_ap_dung": [
                    "Đặt hẹn giờ 52 phút cho phiên học.",
                    "Tập trung hoàn toàn vào việc học trong 52 phút.",
                    "Nghỉ ngơi 17 phút (có thể đi bộ, uống nước, thư giãn).",
                    "Lặp lại chu kỳ cho đến khi hoàn thành mục tiêu học tập."
                ],
                "tinh_toan": {
                    "session_time": 52,
                    "break_time": 17,
                    "long_break_time": 0,
                    "sessions_before_long_break": 0,
                    "description": "52 phút học + 17 phút nghỉ"
                }
            },
            {
                "ten_phuong_phap": "Kỹ thuật Ultradian Rhythm",
                "mo_ta": "Học tập trong 90 phút (1.5 giờ) tập trung, sau đó nghỉ 20 phút. Phù hợp cho việc học các chủ đề phức tạp cần thời gian dài để hiểu sâu.",
                "logic": "90 phút là thời gian tối ưu để não bộ xử lý thông tin phức tạp và hình thành các kết nối thần kinh mới. Nghỉ 20 phút giúp củng cố kiến thức và chuẩn bị cho phiên học tiếp theo.",
                "cach_hoc_ap_dung": [
                    "Chuẩn bị tài liệu và môi trường học tập.",
                    "Học tập tập trung trong 90 phút.",
                    "Nghỉ ngơi 20 phút (có thể review nhanh những gì đã học).",
                    "Tiếp tục với phiên học tiếp theo nếu cần."
                ],
                "tinh_toan": {
                    "session_time": 90,
                    "break_time": 20,
                    "long_break_time": 0,
                    "sessions_before_long_break": 0,
                    "description": "90 phút học + 20 phút nghỉ"
                }
            },
            {
                "ten_phuong_phap": "Kỹ thuật Balancing",
                "mo_ta": "Học tập trong 45 phút, sau đó nghỉ 15 phút. Phù hợp cho việc học các môn học cần sự tập trung vừa phải và thời gian nghỉ ngơi hợp lý.",
                "logic": "45 phút là thời gian phù hợp để duy trì sự tập trung mà không bị mệt mỏi quá mức. 15 phút nghỉ ngơi đủ để thư giãn và chuẩn bị cho phiên học tiếp theo.",
                "cach_hoc_ap_dung": [
                    "Đặt hẹn giờ 45 phút cho phiên học.",
                    "Học tập tập trung trong 45 phút.",
                    "Nghỉ ngơi 15 phút (có thể làm việc khác nhẹ nhàng).",
                    "Lặp lại chu kỳ cho đến khi hoàn thành."
                ],
                "tinh_toan": {
                    "session_time": 45,
                    "break_time": 15,
                    "long_break_time": 0,
                    "sessions_before_long_break": 0,
                    "description": "45 phút học + 15 phút nghỉ"
                }
            },
            {
                "ten_phuong_phap": "Kỹ thuật Flowtime",
                "mo_ta": "Học tập trong 30 phút, sau đó nghỉ 10 phút. Phù hợp cho việc học các môn học cần sự tập trung ngắn hạn và thường xuyên nghỉ ngơi.",
                "logic": "30 phút là thời gian ngắn đủ để duy trì sự tập trung cao độ mà không bị mệt mỏi. 10 phút nghỉ ngơi giúp não bộ xử lý thông tin và chuẩn bị cho phiên học tiếp theo.",
                "cach_hoc_ap_dung": [
                    "Đặt hẹn giờ 30 phút cho phiên học.",
                    "Học tập tập trung trong 30 phút.",
                    "Nghỉ ngơi 10 phút (có thể đi lại, uống nước).",
                    "Lặp lại chu kỳ cho đến khi hoàn thành."
                ],
                "tinh_toan": {
                    "session_time": 30,
                    "break_time": 10,
                    "long_break_time": 0,
                    "sessions_before_long_break": 0,
                    "description": "30 phút học + 10 phút nghỉ"
                }
            }
        ]
    };

    // Biến cho timer và study plan
    let timerInterval = null;
    let timerTime = 25 * 60; // 25 phút mặc định
    let isTimerRunning = false;
    
    // Biến cho study plan
    let currentStudyPlan = null;
    let currentSessionIndex = 0;
    let currentSessionType = 'study'; // 'study' hoặc 'break'
    let isStudySessionActive = false;
    let isFullscreenMode = false;

    // Xử lý sự kiện click vào calendar utility
    setTimeout(() => {
        const calendarUtility = document.getElementById('calendar-utility');
        const backToUtilitiesBtn = document.getElementById('back-to-utilities-btn');
        
        if (calendarUtility) {
            calendarUtility.addEventListener('click', () => {
                // Ẩn tất cả sections
                studySection.classList.remove('active');
                utilitiesSection.classList.remove('active');
                calendarSection.classList.remove('active');
                clockSection.classList.remove('active');
                infoSection.classList.remove('active');
                
                // Hiển thị calendar section
                calendarSection.classList.add('active');
                
                // Khởi động countdown và hiển thị lịch thi
                if (examCountdownInterval) {
                    clearInterval(examCountdownInterval);
                    examCountdownInterval = null;
                }
                displayExamSchedule();
            });
        }
        
        if (backToUtilitiesBtn) {
            backToUtilitiesBtn.addEventListener('click', () => {
                // Ẩn tất cả sections
                studySection.classList.remove('active');
                utilitiesSection.classList.remove('active');
                calendarSection.classList.remove('active');
                clockSection.classList.remove('active');
                infoSection.classList.remove('active');
                
                // Hiển thị utilities section
                utilitiesSection.classList.add('active');
                
                // Dừng countdown khi quay lại utilities
                if (examCountdownInterval) {
                    clearInterval(examCountdownInterval);
                    examCountdownInterval = null;
                }
            });
        }
    }, 100);

    // Xử lý sự kiện click vào clock utility
    setTimeout(() => {
        const clockUtility = document.getElementById('clock-utility');
        const backToUtilitiesFromClockBtn = document.getElementById('back-to-utilities-from-clock-btn');
        
        if (clockUtility) {
            clockUtility.addEventListener('click', () => {
                // Ẩn tất cả sections
                studySection.classList.remove('active');
                utilitiesSection.classList.remove('active');
                calendarSection.classList.remove('active');
                clockSection.classList.remove('active');
                infoSection.classList.remove('active');
                
                // Hiển thị clock section
                clockSection.classList.add('active');
            });
        }
        
        if (backToUtilitiesFromClockBtn) {
            backToUtilitiesFromClockBtn.addEventListener('click', () => {
                // Ẩn tất cả sections
                studySection.classList.remove('active');
                utilitiesSection.classList.remove('active');
                calendarSection.classList.remove('active');
                clockSection.classList.remove('active');
                infoSection.classList.remove('active');
                
                // Hiển thị utilities section
                utilitiesSection.classList.add('active');
                
                // Dừng timer nếu đang chạy
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    isTimerRunning = false;
                }
            });
        }
    }, 100);



    // Hàm populate method cards
    function populateMethodCards() {
        const methodCardsGrid = document.getElementById('method-cards-grid');
        if (!methodCardsGrid) return;

        methodCardsGrid.innerHTML = '';
        
        const methodIcons = [
            '🍅', // Pomodoro
            '⏰', // 52/17
            '📚', // 90/20
            '⏱️', // 45/15
            '⚡'  // 30/10
        ];

        const methodColors = [
            '#e74c3c', // Pomodoro - Red
            '#3498db', // 52/17 - Blue
            '#9b59b6', // 90/20 - Purple
            '#f39c12', // 45/15 - Orange
            '#2ecc71'  // 30/10 - Green
        ];

        const methodTags = [
            'Phổ biến nhất',
            'Khoa học',
            'Chuyên sâu',
            'Cân bằng',
            'Nhanh'
        ];
        
        studyMethods.phuong_phap_hoc_tap_quan_ly_thoi_gian.forEach((method, index) => {
            const methodCard = document.createElement('div');
            methodCard.className = 'method-selection-card';
            methodCard.dataset.methodIndex = index;
            
            methodCard.innerHTML = `
                <div class="method-card-header">
                    <div class="method-icon" style="background: ${methodColors[index]}">
                        <span>${methodIcons[index]}</span>
                    </div>
                    <div class="method-info">
                        <h4>${method.ten_phuong_phap}</h4>
                        <span class="method-tag" style="background: ${methodColors[index]}">${methodTags[index]}</span>
                    </div>
                    <div class="method-radio">
                        <input type="radio" name="method-selection" id="method-${index}" value="${index}">
                        <label for="method-${index}"></label>
                    </div>
                </div>
                <div class="method-card-body">
                    <p class="method-description">${method.mo_ta}</p>
                    <div class="method-timing">
                        <span class="timing-info">
                            <i class="ph ph-clock"></i>
                            ${method.tinh_toan.description}
                        </span>
                    </div>
                </div>
                <div class="method-card-footer">
                    <div class="method-stats">
                        <div class="stat">
                            <span class="stat-label">Học</span>
                            <span class="stat-value">${method.tinh_toan.session_time}p</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Nghỉ</span>
                            <span class="stat-value">${method.tinh_toan.break_time}p</span>
                        </div>
                        ${method.tinh_toan.long_break_time > 0 ? `
                        <div class="stat">
                            <span class="stat-label">Nghỉ dài</span>
                            <span class="stat-value">${method.tinh_toan.long_break_time}p</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            methodCardsGrid.appendChild(methodCard);

            // Add click event listener
            methodCard.addEventListener('click', () => {
                selectMethod(index);
            });
        });
    }

    // Hàm chọn phương pháp
    function selectMethod(methodIndex) {
        // Remove previous selection
        document.querySelectorAll('.method-selection-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked card
        const selectedCard = document.querySelector(`[data-method-index="${methodIndex}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        // Check radio button
        const radio = document.getElementById(`method-${methodIndex}`);
        if (radio) {
            radio.checked = true;
        }

        // Enable generate button if all fields are filled
        checkFormCompletion();
    }

    // Hàm kiểm tra form completion
    function checkFormCompletion() {
        const selectedMethod = document.querySelector('input[name="method-selection"]:checked');
        const totalTime = document.getElementById('total-time').value;
        const subject = document.getElementById('subject-input').value;
        const generateBtn = document.getElementById('generate-plan-btn');

        if (selectedMethod && totalTime && subject.trim()) {
            generateBtn.disabled = false;
            generateBtn.classList.add('enabled');
        } else {
            generateBtn.disabled = true;
            generateBtn.classList.remove('enabled');
        }
    }

    // Hàm tạo study plan
    function generateStudyPlan() {
        const selectedMethod = document.querySelector('input[name="method-selection"]:checked');
        const totalTime = parseInt(document.getElementById('total-time').value);
        const subject = document.getElementById('subject-input').value;

        if (!selectedMethod || !totalTime || !subject) {
            alert('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        const methodIndex = selectedMethod.value;

        const method = studyMethods.phuong_phap_hoc_tap_quan_ly_thoi_gian[methodIndex];
        const calculation = method.tinh_toan;

        // Tính toán số phiên học
        const sessionTime = calculation.session_time;
        const breakTime = calculation.break_time;
        const longBreakTime = calculation.long_break_time;
        const sessionsBeforeLongBreak = calculation.sessions_before_long_break;

        let remainingTime = totalTime;
        let sessions = [];
        let sessionNumber = 1;
        let totalStudyTime = 0;
        let totalBreakTime = 0;

        while (remainingTime > 0) {
            // Thêm phiên học
            if (remainingTime >= sessionTime) {
                sessions.push({
                    type: 'study',
                    duration: sessionTime,
                    number: sessionNumber,
                    description: `Phiên học ${sessionNumber}`
                });
                remainingTime -= sessionTime;
                totalStudyTime += sessionTime;
                sessionNumber++;
            } else {
                // Phiên học cuối cùng ngắn hơn
                sessions.push({
                    type: 'study',
                    duration: remainingTime,
                    number: sessionNumber,
                    description: `Phiên học ${sessionNumber} (cuối)`
                });
                totalStudyTime += remainingTime;
                remainingTime = 0;
                break;
            }

            // Thêm thời gian nghỉ
            if (remainingTime > 0) {
                let breakDuration = breakTime;
                
                // Kiểm tra xem có cần nghỉ dài không
                if (sessionsBeforeLongBreak > 0 && (sessionNumber - 1) % sessionsBeforeLongBreak === 0) {
                    breakDuration = longBreakTime;
                }

                if (remainingTime >= breakDuration) {
                    sessions.push({
                        type: 'break',
                        duration: breakDuration,
                        number: sessionNumber - 1,
                        description: breakDuration === longBreakTime ? 'Nghỉ dài' : 'Nghỉ ngắn'
                    });
                    remainingTime -= breakDuration;
                    totalBreakTime += breakDuration;
                } else {
                    // Nghỉ ngắn hơn nếu không đủ thời gian
                    sessions.push({
                        type: 'break',
                        duration: remainingTime,
                        number: sessionNumber - 1,
                        description: 'Nghỉ ngắn'
                    });
                    totalBreakTime += remainingTime;
                    remainingTime = 0;
                }
            }
        }

        currentStudyPlan = {
            method: method,
            subject: subject,
            totalTime: totalTime,
            sessions: sessions,
            totalStudyTime: totalStudyTime,
            totalBreakTime: totalBreakTime,
            totalSessions: sessions.filter(s => s.type === 'study').length
        };

        displayStudyPlan();
    }

    // Hàm hiển thị study plan
    function displayStudyPlan() {
        if (!currentStudyPlan) return;

        const planSummary = document.getElementById('plan-summary');
        const planTimeline = document.getElementById('plan-timeline');
        const generatedPlanSection = document.getElementById('generated-plan-section');
        const studyPlanSection = document.querySelector('.study-plan-section');

        // Ẩn UI chọn phương pháp
        studyPlanSection.style.display = 'none';

        // Hiển thị summary với UI đẹp hơn
        planSummary.innerHTML = `
            <div class="plan-header">
                <div class="plan-title">
                    <i class="ph ph-calendar-check"></i>
                    <h3>Lịch học của bạn</h3>
                </div>
                <div class="plan-subtitle">Đã được tối ưu theo phương pháp ${currentStudyPlan.method.ten_phuong_phap}</div>
            </div>
            
            <div class="plan-stats">
                <div class="stat-card primary">
                    <div class="stat-icon">
                        <i class="ph ph-book-open"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${currentStudyPlan.subject}</div>
                        <div class="stat-label">Môn học</div>
                    </div>
                </div>
                
                <div class="stat-card success">
                    <div class="stat-icon">
                        <i class="ph ph-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${currentStudyPlan.totalTime} phút</div>
                        <div class="stat-label">Tổng thời gian</div>
                    </div>
                </div>
                
                <div class="stat-card info">
                    <div class="stat-icon">
                        <i class="ph ph-graduation-cap"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${currentStudyPlan.totalStudyTime} phút</div>
                        <div class="stat-label">Thời gian học</div>
                    </div>
                </div>
                
                <div class="stat-card warning">
                    <div class="stat-icon">
                        <i class="ph ph-coffee"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${currentStudyPlan.totalBreakTime} phút</div>
                        <div class="stat-label">Thời gian nghỉ</div>
                    </div>
                </div>
                
                <div class="stat-card secondary">
                    <div class="stat-icon">
                        <i class="ph ph-list-numbers"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${currentStudyPlan.totalSessions}</div>
                        <div class="stat-label">Phiên học</div>
                    </div>
                </div>
            </div>
        `;

        // Hiển thị timeline với UI đẹp hơn
        planTimeline.innerHTML = `
            <div class="timeline-header">
                <h3><i class="ph ph-timeline"></i> Lịch trình chi tiết</h3>
                <p>Thực hiện theo thứ tự để đạt hiệu quả tối ưu</p>
            </div>
            
            <div class="timeline-container">
                ${currentStudyPlan.sessions.map((session, index) => `
                    <div class="timeline-item ${session.type}">
                        <div class="timeline-marker">
                            <div class="marker-number">${index + 1}</div>
                            <div class="marker-icon">
                                ${session.type === 'study' ? '<i class="ph ph-book-open"></i>' : '<i class="ph ph-coffee"></i>'}
                            </div>
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <h4>${session.description}</h4>
                                <div class="timeline-duration">
                                    <i class="ph ph-clock"></i>
                                    ${session.duration} phút
                                </div>
                            </div>
                            <div class="timeline-type">
                                <span class="type-badge ${session.type}">
                                    ${session.type === 'study' ? '📚 Học tập' : '☕ Nghỉ ngơi'}
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        generatedPlanSection.style.display = 'block';
    }

    // Hàm bắt đầu study session
    function startStudySession() {
        if (!currentStudyPlan || currentStudyPlan.sessions.length === 0) return;

        isStudySessionActive = true;
        currentSessionIndex = 0;
        currentSessionType = 'study';

        // Debug log
        console.log('Starting study session with plan:', currentStudyPlan);

        // Ẩn plan section và hiển thị timer section với giao diện mới
        document.getElementById('generated-plan-section').style.display = 'none';
        const timerSection = document.getElementById('timer-section');
        timerSection.style.display = 'block';
        
        // Tạo giao diện dark mode/no dark mode chỉ với Pomodoro timer
        timerSection.innerHTML = `
            <div class="dark-study-interface">
                <!-- Keep Screen On Toggle -->
                <div class="keep-screen-toggle">
                    <div class="toggle-content">
                        <i class="ph ph-sun"></i>
                        <span>Keep Screen On</span>
                    </div>
                    <div class="toggle-switch">
                        <input type="checkbox" id="keep-screen-checkbox" checked>
                        <label for="keep-screen-checkbox"></label>
                    </div>
                </div>
                
                <!-- Main Content Cards -->
                <div class="study-cards-container single-timer">
                    <!-- Pomodoro Timer Card -->
                    <div class="study-card pomodoro-card">
                        <div class="pomodoro-header">
                            <span class="pomodoro-label">pomodoro</span>
                        </div>
                        <div class="pomodoro-timer">
                            <div class="timer-display" id="timer-time">25:00</div>
                        </div>
                        <div class="pomodoro-controls">
                            <button class="pomodoro-btn" id="start-timer">Start</button>
                            <button class="pomodoro-btn" id="pause-timer" style="display: none;">Pause</button>
                            <button class="pomodoro-btn" id="next-session-btn" style="display: none;">Next</button>
                        </div>
                        <div class="fullscreen-btn">
                            <button class="fullscreen-timer-btn" id="fullscreen-timer-btn">
                                <i class="ph ph-arrows-out"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Session Schedule Button -->
                <div class="schedule-button-container">
                    <button class="schedule-btn" id="show-schedule-btn">
                        <i class="ph ph-list"></i>
                        <span>Lịch trình phiên</span>
                    </button>
                </div>
                
                <!-- Session Schedule Modal -->
                <div class="schedule-modal" id="schedule-modal" style="display: none;">
                    <div class="schedule-modal-content">
                        <div class="schedule-modal-header">
                            <h3>Lịch trình học tập</h3>
                            <button class="close-modal-btn" id="close-schedule-btn">
                                <i class="ph ph-x"></i>
                            </button>
                        </div>
                        <div class="schedule-list" id="schedule-list">
                            <!-- Sẽ được populate bởi JavaScript -->
                        </div>
                    </div>
                </div>
                
                <!-- Session Info (ẩn trong fullscreen) -->
                <div class="session-info" id="session-info" style="display: none;"></div>
                <div class="session-progress" id="session-progress" style="display: none;"></div>
            </div>
        `;

        // Bắt đầu phiên đầu tiên ngay lập tức
        startCurrentSession();
        
        // Khởi tạo analog clock
        initializeAnalogClock();
        
        // Thêm event listeners cho các nút mới
        setTimeout(() => {
            const startTimerBtn = document.getElementById('start-timer');
            const pauseTimerBtn = document.getElementById('pause-timer');
            const nextSessionBtn = document.getElementById('next-session-btn');
            const keepScreenCheckbox = document.getElementById('keep-screen-checkbox');
            const showScheduleBtn = document.getElementById('show-schedule-btn');
            const closeScheduleBtn = document.getElementById('close-schedule-btn');
            const scheduleModal = document.getElementById('schedule-modal');
            const fullscreenTimerBtn = document.getElementById('fullscreen-timer-btn');

            if (startTimerBtn) {
                startTimerBtn.addEventListener('click', startTimer);
            }
            
            if (pauseTimerBtn) {
                pauseTimerBtn.addEventListener('click', pauseTimer);
            }

            if (nextSessionBtn) {
                nextSessionBtn.addEventListener('click', nextSession);
            }

            if (keepScreenCheckbox) {
                keepScreenCheckbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        // Enable keep screen on
                        console.log('Keep screen on enabled');
                    } else {
                        // Disable keep screen on
                        console.log('Keep screen on disabled');
                    }
                });
            }

            if (showScheduleBtn) {
                showScheduleBtn.addEventListener('click', showSessionSchedule);
            }

            if (closeScheduleBtn) {
                closeScheduleBtn.addEventListener('click', () => {
                    if (scheduleModal) {
                        scheduleModal.style.display = 'none';
                    }
                });
            }

            if (fullscreenTimerBtn) {
                fullscreenTimerBtn.addEventListener('click', toggleFullscreenTimer);
            }

            // Đóng modal khi click bên ngoài
            if (scheduleModal) {
                scheduleModal.addEventListener('click', (e) => {
                    if (e.target === scheduleModal) {
                        scheduleModal.style.display = 'none';
                    }
                });
            }
        }, 100);
    }

    // Hàm khởi tạo đồng hồ analog
    function initializeAnalogClock() {
        function updateClock() {
            const now = new Date();
            const hours = now.getHours() % 12;
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            
            const hourHand = document.getElementById('hour-hand');
            const minuteHand = document.getElementById('minute-hand');
            const secondHand = document.getElementById('second-hand');
            
            if (hourHand && minuteHand && secondHand) {
                // Tính góc cho kim giờ (bao gồm cả phút để kim giờ di chuyển mượt mà)
                const hourDegrees = (hours * 30) + (minutes * 0.5);
                // Tính góc cho kim phút
                const minuteDegrees = minutes * 6;
                // Tính góc cho kim giây
                const secondDegrees = seconds * 6;
                
                hourHand.style.transform = `rotate(${hourDegrees}deg)`;
                minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
                secondHand.style.transform = `rotate(${secondDegrees}deg)`;
            }
        }
        
        // Cập nhật đồng hồ mỗi giây
        updateClock();
        setInterval(updateClock, 1000);
    }

    // Hàm bắt đầu phiên hiện tại
    function startCurrentSession() {
        if (!isStudySessionActive || !currentStudyPlan) return;

        const currentSession = currentStudyPlan.sessions[currentSessionIndex];
        if (!currentSession) {
            // Kết thúc tất cả phiên
            endStudySession();
            return;
        }

        currentSessionType = currentSession.type;
        timerTime = currentSession.duration * 60; // Chuyển sang giây
        
        // Debug log
        console.log(`Starting session: ${currentSession.description}, duration: ${currentSession.duration} minutes, timerTime: ${timerTime} seconds`);

        // Cập nhật label pomodoro thành tên phương pháp thực tế
        const pomodoroLabel = document.querySelector('.pomodoro-label');
        if (pomodoroLabel) {
            const methodName = currentStudyPlan.method.ten_phuong_phap.replace('Kỹ thuật ', '').toLowerCase();
            pomodoroLabel.textContent = methodName;
        }

        // Cập nhật thông tin phiên (ẩn trong giao diện mới)
        const sessionInfo = document.getElementById('session-info');
        if (sessionInfo) {
            sessionInfo.innerHTML = `
                <div class="current-session-info">
                    <h3>${currentSession.description}</h3>
                    <p><strong>Môn học:</strong> ${currentStudyPlan.subject}</p>
                    <p><strong>Loại:</strong> ${currentSession.type === 'study' ? '📚 Học tập' : '☕ Nghỉ ngơi'}</p>
                    <p><strong>Tiến độ:</strong> ${currentSessionIndex + 1}/${currentStudyPlan.sessions.length}</p>
                </div>
            `;
        }

        // Cập nhật progress
        updateSessionProgress();

        // Reset timer display - đảm bảo timer được hiển thị đúng
        updateTimerDisplay();

        // Hiển thị nút phù hợp
        const startTimerBtn = document.getElementById('start-timer');
        const pauseTimerBtn = document.getElementById('pause-timer');
        const nextSessionBtn = document.getElementById('next-session-btn');
        
        if (startTimerBtn) {
            startTimerBtn.style.display = 'inline-block';
            startTimerBtn.textContent = 'Start';
        }
        if (pauseTimerBtn) pauseTimerBtn.style.display = 'none';
        if (nextSessionBtn) nextSessionBtn.style.display = 'none';
    }

    // Hàm cập nhật progress
    function updateSessionProgress() {
        if (!currentStudyPlan) return;

        const progressContainer = document.getElementById('session-progress');
        const completedSessions = currentSessionIndex;
        const totalSessions = currentStudyPlan.sessions.length;
        const progressPercentage = (completedSessions / totalSessions) * 100;

        progressContainer.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercentage}%"></div>
            </div>
            <p class="progress-text">Tiến độ: ${completedSessions}/${totalSessions} phiên</p>
        `;
    }

    // Hàm kết thúc study session
    function endStudySession() {
        isStudySessionActive = false;
        currentStudyPlan = null;
        currentSessionIndex = 0;
        currentSessionType = 'study';
        isFullscreenMode = false;

        // Dừng timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Hiển thị thông báo hoàn thành
        alert('Chúc mừng! Bạn đã hoàn thành tất cả phiên học! 🎉');

        // Quay lại UI chọn phương pháp
        document.getElementById('timer-section').style.display = 'none';
        document.querySelector('.study-plan-section').style.display = 'block';
        document.getElementById('generated-plan-section').style.display = 'none';
        
        // Reset form
        document.querySelectorAll('.method-selection-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelectorAll('input[name="method-selection"]').forEach(radio => {
            radio.checked = false;
        });
        document.getElementById('total-time').value = '120';
        document.getElementById('subject-input').value = '';
        document.querySelectorAll('.time-preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Disable generate button
        const generateBtn = document.getElementById('generate-plan-btn');
        generateBtn.disabled = true;
        generateBtn.classList.remove('enabled');
    }

    // Hàm toggle fullscreen mode
    function toggleFullscreenMode() {
        const timerSection = document.getElementById('timer-section');
        const timerMainContent = timerSection.querySelector('.timer-main-content');
        
        if (!isFullscreenMode) {
            // Enter fullscreen
            timerSection.classList.add('fullscreen-mode');
            timerMainContent.classList.add('fullscreen-content');
            isFullscreenMode = true;
        } else {
            // Exit fullscreen
            timerSection.classList.remove('fullscreen-mode');
            timerMainContent.classList.remove('fullscreen-content');
            isFullscreenMode = false;
        }
    }

    // Hàm chuyển sang phiên tiếp theo
    function nextSession() {
        if (!isStudySessionActive || !currentStudyPlan) return;

        currentSessionIndex++;
        
        // Ẩn nút Next và hiển thị nút Start
        const nextSessionBtn = document.getElementById('next-session-btn');
        const startTimerBtn = document.getElementById('start-timer');
        
        if (nextSessionBtn) {
            nextSessionBtn.style.display = 'none';
            nextSessionBtn.textContent = 'Next';
        }
        if (startTimerBtn) {
            startTimerBtn.style.display = 'inline-block';
            startTimerBtn.textContent = 'Start';
        }
        
        startCurrentSession();
    }

    // Hàm cập nhật hiển thị timer
    function updateTimerDisplay() {
        const timerDisplay = document.getElementById('timer-time');
        if (!timerDisplay) {
            console.error('Timer display element not found');
            return;
        }

        const minutes = Math.floor(timerTime / 60);
        const seconds = timerTime % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerDisplay.textContent = timeString;
        
        // Debug log
        console.log(`Timer updated: ${timeString} (${timerTime} seconds)`);
    }

    // Hàm bắt đầu timer
    function startTimer() {
        if (isTimerRunning) return;
        
        // Debug log
        console.log(`Starting timer with ${timerTime} seconds remaining`);
        
        isTimerRunning = true;
        const startTimerBtn = document.getElementById('start-timer');
        const pauseTimerBtn = document.getElementById('pause-timer');
        
        if (startTimerBtn) {
            startTimerBtn.style.display = 'none';
            startTimerBtn.textContent = 'Start';
        }
        if (pauseTimerBtn) {
            pauseTimerBtn.style.display = 'inline-block';
            pauseTimerBtn.textContent = 'Pause';
        }
        
        timerInterval = setInterval(() => {
            timerTime--;
            updateTimerDisplay();
            
            // Debug log every 10 seconds
            if (timerTime % 10 === 0) {
                console.log(`Timer tick: ${timerTime} seconds remaining`);
            }
            
            if (timerTime <= 0) {
                console.log('Timer finished!');
                clearInterval(timerInterval);
                timerInterval = null;
                isTimerRunning = false;
                
                // Thông báo khi hết giờ
                const sessionType = currentSessionType === 'study' ? 'học tập' : 'nghỉ ngơi';
                const message = currentSessionType === 'study' ? 'Đã đến lúc nghỉ ngơi!' : 'Đã đến lúc học tiếp!';
                
                if (Notification.permission === 'granted') {
                    new Notification('Hết giờ!', {
                        body: message,
                        icon: '/favicon.ico'
                    });
                }
                
                // Phát âm thanh
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgoTdDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
                audio.play().catch(() => {});
                
                // Xử lý kết thúc phiên
                if (isStudySessionActive && currentStudyPlan) {
                    // Hiển thị nút chuyển phiên tiếp theo
                    if (startTimerBtn) startTimerBtn.style.display = 'none';
                    if (pauseTimerBtn) pauseTimerBtn.style.display = 'none';
                    
                    const nextSessionBtn = document.getElementById('next-session-btn');
                    if (nextSessionBtn) {
                        nextSessionBtn.style.display = 'inline-block';
                        nextSessionBtn.textContent = 'Next';
                    }
                    
                    // Tự động chuyển phiên sau 3 giây nếu là phiên nghỉ
                    if (currentSessionType === 'break') {
                        setTimeout(() => {
                            const nextBtn = document.getElementById('next-session-btn');
                            if (nextBtn && nextBtn.style.display !== 'none') {
                                nextSession();
                            }
                        }, 3000);
                    }
                } else {
                    // Timer thông thường
                    if (startTimerBtn) {
                        startTimerBtn.style.display = 'inline-block';
                        startTimerBtn.textContent = 'Start';
                    }
                    if (pauseTimerBtn) pauseTimerBtn.style.display = 'none';
                }
            }
        }, 1000);
    }

    // Hàm tạm dừng timer
    function pauseTimer() {
        if (!isTimerRunning) return;
        
        console.log('Pausing timer');
        clearInterval(timerInterval);
        timerInterval = null;
        isTimerRunning = false;
        
        const startTimerBtn = document.getElementById('start-timer');
        const pauseTimerBtn = document.getElementById('pause-timer');
        
        if (startTimerBtn) {
            startTimerBtn.style.display = 'inline-block';
            startTimerBtn.textContent = 'Start';
        }
        if (pauseTimerBtn) {
            pauseTimerBtn.style.display = 'none';
            pauseTimerBtn.textContent = 'Pause';
        }
    }

    // Hàm đặt lại timer
    function resetTimer() {
        pauseTimer();
        
        // Đặt lại timer theo phiên hiện tại
        if (currentStudyPlan && currentStudyPlan.sessions[currentSessionIndex]) {
            timerTime = currentStudyPlan.sessions[currentSessionIndex].duration * 60;
        } else {
            timerTime = 25 * 60; // Fallback về 25 phút
        }
        
        updateTimerDisplay();
    }

    // Thêm event listeners cho timer controls và study plan
    setTimeout(() => {
        const startTimerBtn = document.getElementById('start-timer');
        const pauseTimerBtn = document.getElementById('pause-timer');
        const resetTimerBtn = document.getElementById('reset-timer');
        const nextSessionBtn = document.getElementById('next-session-btn');
        const generatePlanBtn = document.getElementById('generate-plan-btn');
        const startStudySessionBtn = document.getElementById('start-study-session-btn');
        const resetPlanBtn = document.getElementById('reset-plan-btn');
        const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');

        if (startTimerBtn) {
            startTimerBtn.addEventListener('click', startTimer);
        }
        
        if (pauseTimerBtn) {
            pauseTimerBtn.addEventListener('click', pauseTimer);
        }
        
        if (resetTimerBtn) {
            resetTimerBtn.addEventListener('click', resetTimer);
        }

        if (nextSessionBtn) {
            nextSessionBtn.addEventListener('click', nextSession);
        }

        if (generatePlanBtn) {
            generatePlanBtn.addEventListener('click', generateStudyPlan);
        }

        if (startStudySessionBtn) {
            startStudySessionBtn.addEventListener('click', startStudySession);
        }

        if (resetPlanBtn) {
            resetPlanBtn.addEventListener('click', () => {
                // Hiển thị lại UI chọn phương pháp
                document.querySelector('.study-plan-section').style.display = 'block';
                document.getElementById('generated-plan-section').style.display = 'none';
                document.getElementById('timer-section').style.display = 'none';
                
                // Reset form
                document.querySelectorAll('.method-selection-card').forEach(card => {
                    card.classList.remove('selected');
                });
                document.querySelectorAll('input[name="method-selection"]').forEach(radio => {
                    radio.checked = false;
                });
                document.getElementById('total-time').value = '120';
                document.getElementById('subject-input').value = '';
                document.querySelectorAll('.time-preset-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Disable generate button
                const generateBtn = document.getElementById('generate-plan-btn');
                generateBtn.disabled = true;
                generateBtn.classList.remove('enabled');
                
                currentStudyPlan = null;
                isStudySessionActive = false;
            });
        }

        if (exitFullscreenBtn) {
            exitFullscreenBtn.addEventListener('click', () => {
                // Quay lại UI chọn phương pháp
                document.getElementById('timer-section').style.display = 'none';
                document.querySelector('.study-plan-section').style.display = 'block';
                document.getElementById('generated-plan-section').style.display = 'none';
                
                // Reset timer state
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    isTimerRunning = false;
                }
                
                isStudySessionActive = false;
                isFullscreenMode = false;
            });
        }



        // Populate method cards
        populateMethodCards();

        // Add event listeners for form inputs
        const totalTimeInput = document.getElementById('total-time');
        const subjectInput = document.getElementById('subject-input');
        const timePresetBtns = document.querySelectorAll('.time-preset-btn');

        if (totalTimeInput) {
            totalTimeInput.addEventListener('input', checkFormCompletion);
        }

        if (subjectInput) {
            subjectInput.addEventListener('input', checkFormCompletion);
        }

        // Time preset buttons
        timePresetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const time = parseInt(btn.dataset.time);
                totalTimeInput.value = time;
                checkFormCompletion();
                
                // Update active state
                timePresetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Yêu cầu quyền thông báo
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, 200);

    // --- Dark Mode Logic ---
    function initializeDarkMode() {
        const darkModeCheckbox = document.getElementById('dark-mode-checkbox');
        
        // Kiểm tra trạng thái dark mode từ localStorage
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        
        // Đồng bộ checkbox với trạng thái hiện tại
        if (darkModeCheckbox) {
            darkModeCheckbox.checked = isDarkMode;
            
            // Xử lý sự kiện toggle dark mode
            darkModeCheckbox.addEventListener('change', () => {
                if (darkModeCheckbox.checked) {
                    document.body.classList.add('dark-mode');
                    localStorage.setItem('darkMode', 'true');
                } else {
                    document.body.classList.remove('dark-mode');
                    localStorage.setItem('darkMode', 'false');
                }
            });
        }
    }
    
    // Khởi tạo dark mode sau khi tạo utilities section
    initializeDarkMode();

    // --- Khởi tạo ứng dụng ---
    // Hiển thị study section mặc định
    studySection.classList.add('active');
    utilitiesSection.classList.remove('active');
    calendarSection.classList.remove('active');
    clockSection.classList.remove('active');
    infoSection.classList.remove('active');
    displaySubjectSelection(); // Gọi lần đầu để hiển thị môn học

    // Hàm hiển thị lịch trình phiên
    function showSessionSchedule() {
        if (!currentStudyPlan) return;

        const scheduleList = document.getElementById('schedule-list');
        const scheduleModal = document.getElementById('schedule-modal');
        const scheduleModalContent = document.querySelector('.schedule-modal-content');
        
        if (!scheduleList || !scheduleModal) return;

        scheduleList.innerHTML = currentStudyPlan.sessions.map((session, index) => {
            const isCompleted = index < currentSessionIndex;
            const isCurrent = index === currentSessionIndex;
            const isUpcoming = index > currentSessionIndex;
            
            let badgeClass = 'schedule-badge';
            let badgeType = session.type === 'study' ? 'study' : 'break';
            let badgeState = isCurrent ? 'current' : isCompleted ? 'completed' : 'upcoming';
            let badgeIcon = session.type === 'study' ? 'ph-book-open' : 'ph-coffee';
            let badgeText = session.type === 'study' ? 'HỌC TẬP' : 'NGHỈ NGƠI';
            let itemState = isCurrent ? 'current' : isCompleted ? 'completed' : 'upcoming';

            return `
                <div class="schedule-item ${itemState}">
                    <div class="schedule-timeline-col">
                        <div class="schedule-number">${index + 1}</div>
                    </div>
                    <div class="schedule-content-col">
                        <div class="schedule-title">${session.description}</div>
                        <div class="schedule-duration">${session.duration} phút</div>
                        <div class="schedule-status">
                            <span class="status-text ${badgeState}">${isCompleted ? 'Đã hoàn thành' : isCurrent ? 'Đang thực hiện' : 'Chưa thực hiện'}</span>
                        </div>
                        <div class="${badgeClass} ${badgeType} ${badgeState}">
                            <i class="ph ${badgeIcon}"></i> ${badgeText}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Hiển thị modal dạng pop-up nổi
        scheduleModal.style.display = 'flex';
        if (scheduleModalContent) {
            scheduleModalContent.style.margin = 'auto';
        }
        // Đảm bảo overlay che nền
        scheduleModal.style.position = 'fixed';
        scheduleModal.style.top = '0';
        scheduleModal.style.left = '0';
        scheduleModal.style.width = '100vw';
        scheduleModal.style.height = '100vh';
        scheduleModal.style.background = 'rgba(0,0,0,0.7)';
        scheduleModal.style.zIndex = '1000';
        scheduleModal.style.alignItems = 'center';
        scheduleModal.style.justifyContent = 'center';
        scheduleModal.style.backdropFilter = 'blur(2px)';
    }

    // Hàm toggle fullscreen cho timer
    function toggleFullscreenTimer() {
        const darkStudyInterface = document.querySelector('.dark-study-interface');
        const fullscreenTimerBtn = document.getElementById('fullscreen-timer-btn');
        const body = document.body;
        
        if (!darkStudyInterface) return;
        
        if (!body.classList.contains('fullscreen-timer-mode')) {
            // Enter fullscreen mode
            body.classList.add('fullscreen-timer-mode');
            if (fullscreenTimerBtn) {
                fullscreenTimerBtn.innerHTML = '<i class="ph ph-arrows-in"></i>';
            }
        } else {
            // Exit fullscreen mode
            body.classList.remove('fullscreen-timer-mode');
            if (fullscreenTimerBtn) {
                fullscreenTimerBtn.innerHTML = '<i class="ph ph-arrows-out"></i>';
            }
        }
    }

}); // Kết thúc DOMContentLoaded
