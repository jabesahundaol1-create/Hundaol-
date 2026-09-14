// ======================================
// GLOBAL VARIABLES
// ======================================

let currentUser = null;
let currentQuestions = [];
let currentQuiz = null;
let videoStream = null;

let messageUsers = [];

let quizExitHandled = false;
let quizExitTimer = null;
let quizPageWasHidden = false;
let quizAttemptRecorded = false;

let localStream = null;
let peerConnection = null;
let currentCallRoom = null;

const rtcConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};


// ======================================
// PAGE NAVIGATION
// ======================================

function showPage(pageId) {

    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.remove("active");
    });

    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active");
    }

    window.scrollTo(0, 0);
}

window.showPage = showPage;


// ======================================
// MESSAGE BOX
// ======================================

function showMessage(message, type = "info") {

    let box = document.getElementById("messageBox");

    if (!box) {

        box = document.createElement("div");

        box.id = "messageBox";

        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.left = "50%";
        box.style.transform = "translateX(-50%)";
        box.style.zIndex = "99999";
        box.style.maxWidth = "90%";
        box.style.padding = "14px 20px";
        box.style.borderRadius = "10px";
        box.style.fontSize = "15px";
        box.style.fontWeight = "600";
        box.style.textAlign = "center";
        box.style.boxShadow =
            "0 4px 15px rgba(0,0,0,0.2)";

        document.body.appendChild(box);
    }

    if (type === "success") {

        box.style.background = "#d4edda";
        box.style.color = "#155724";
        box.style.border = "1px solid #c3e6cb";

    } else if (type === "error") {

        box.style.background = "#f8d7da";
        box.style.color = "#721c24";
        box.style.border = "1px solid #f5c6cb";

    } else if (type === "warning") {

        box.style.background = "#fff3cd";
        box.style.color = "#856404";
        box.style.border = "1px solid #ffeeba";

    } else {

        box.style.background = "#d1ecf1";
        box.style.color = "#0c5460";
        box.style.border = "1px solid #bee5eb";
    }

    box.textContent = message;
    box.style.display = "block";

    clearTimeout(window.messageTimer);

    window.messageTimer = setTimeout(() => {

        box.style.display = "none";

    }, 4000);
}

window.showMessage = showMessage;


// ======================================
// ESCAPE HTML
// ======================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ======================================
// CLOUDINARY
// ======================================

const CLOUDINARY_CLOUD_NAME = "jmet0rch";

const CLOUDINARY_UPLOAD_PRESET = "oda_profile";


// ======================================
// CLOUDINARY PHOTO UPLOAD
// ======================================

async function uploadProfilePhoto(file) {

    if (
        !CLOUDINARY_CLOUD_NAME ||
        CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME"
    ) {

        throw new Error(
            "Cloudinary Cloud Name is not configured."
        );
    }

    const uploadURL =
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const formData = new FormData();

    formData.append("file", file);

    formData.append(
        "upload_preset",
        CLOUDINARY_UPLOAD_PRESET
    );

    const response = await fetch(
        uploadURL,
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    if (!response.ok) {

        throw new Error(
            data.error?.message ||
            "Cloudinary photo upload failed."
        );
    }

    return data.secure_url;
}


// ======================================
// TEACHER REGISTRATION
// ======================================

async function registerTeacher() {

    const name =
        document.getElementById("teacherName").value.trim();

    const email =
        document.getElementById("teacherEmail").value.trim();

    const password =
        document.getElementById("teacherPassword").value;

    const school =
        document.getElementById("teacherSchool").value.trim();

    const subject =
        document.getElementById("teacherSubject").value.trim();

    const photoInput =
        document.getElementById("teacherPhoto");


    if (
        !name ||
        !email ||
        !password ||
        !school ||
        !subject
    ) {

        showMessage(
            "Please fill in all teacher information.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showMessage(
            "Password must be at least 6 characters.",
            "error"
        );

        return;
    }


    if (
        !photoInput ||
        !photoInput.files ||
        photoInput.files.length === 0
    ) {

        showMessage(
            "Profile photo is required.",
            "error"
        );

        return;
    }


    const photoFile = photoInput.files[0];


    if (!photoFile.type.startsWith("image/")) {

        showMessage(
            "Please select an image file.",
            "error"
        );

        return;
    }


    if (photoFile.size > 5 * 1024 * 1024) {

        showMessage(
            "Profile photo must be less than 5 MB.",
            "error"
        );

        return;
    }


    try {

        const {
            auth,
            db,
            createUserWithEmailAndPassword,
            deleteUser,
            doc,
            setDoc
        } = window.firebaseFunctions;


        showMessage(
            "Creating teacher account...",
            "success"
        );


        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user = userCredential.user;


        try {

            showMessage(
                "Uploading profile photo...",
                "success"
            );


            const photoURL =
                await uploadProfilePhoto(photoFile);


            showMessage(
                "Saving teacher information...",
                "success"
            );


            await setDoc(
                doc(db, "users", user.uid),
                {

                    uid: user.uid,

                    name: name,

                    email: email,

                    school: school,

                    subject: subject,

                    role: "teacher",

                    photoURL: photoURL,

                    date: new Date().toISOString()
                }
            );


            showMessage(
                "Teacher registration successful!",
                "success"
            );


            document.getElementById("teacherName").value = "";
            document.getElementById("teacherEmail").value = "";
            document.getElementById("teacherPassword").value = "";
            document.getElementById("teacherSchool").value = "";
            document.getElementById("teacherSubject").value = "";
            document.getElementById("teacherPhoto").value = "";


            const previewContainer =
                document.getElementById(
                    "teacherPhotoPreviewContainer"
                );

            const preview =
                document.getElementById(
                    "teacherPhotoPreview"
                );


            if (previewContainer) {
                previewContainer.style.display = "none";
            }

            if (preview) {
                preview.src = "";
            }


            showPage("homePage");


        } catch (error) {

            try {
                await deleteUser(user);
            } catch (deleteError) {
                console.error(
                    "Delete user error:",
                    deleteError
                );
            }

            throw error;
        }


    } catch (error) {

        console.error(
            "Teacher registration error:",
            error
        );


        if (
            error.code ===
            "auth/email-already-in-use"
        ) {

            showMessage(
                "This email is already registered.",
                "error"
            );

        } else if (
            error.code ===
            "auth/invalid-email"
        ) {

            showMessage(
                "Please enter a valid email address.",
                "error"
            );

        } else if (
            error.code ===
            "auth/weak-password"
        ) {

            showMessage(
                "Password is too weak. Use at least 6 characters.",
                "error"
            );

        } else {

            showMessage(
                error.message ||
                "Teacher registration failed.",
                "error"
            );
        }
    }
}

window.registerTeacher = registerTeacher;


// ======================================
// TEACHER PHOTO PREVIEW
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const teacherPhoto =
            document.getElementById("teacherPhoto");

        if (!teacherPhoto) return;

        teacherPhoto.addEventListener(
            "change",
            function () {

                const file = this.files[0];

                if (!file) return;


                if (!file.type.startsWith("image/")) {

                    showMessage(
                        "Please select an image file.",
                        "error"
                    );

                    this.value = "";

                    return;
                }


                if (file.size > 5 * 1024 * 1024) {

                    showMessage(
                        "Profile photo must be less than 5 MB.",
                        "error"
                    );

                    this.value = "";

                    return;
                }


                const preview =
                    document.getElementById(
                        "teacherPhotoPreview"
                    );

                const container =
                    document.getElementById(
                        "teacherPhotoPreviewContainer"
                    );


                if (preview && container) {

                    preview.src =
                        URL.createObjectURL(file);

                    container.style.display =
                        "block";
                }
            }
        );
    }
);


// ======================================
// STUDENT REGISTRATION
// ======================================

async function registerStudent() {

    const name =
        document.getElementById("studentName").value.trim();

    const email =
        document.getElementById("studentEmail").value.trim();

    const password =
        document.getElementById("studentPassword").value;

    const grade =
        document.getElementById("studentGrade").value;

    const photoInput =
        document.getElementById("studentPhoto");


    if (
        !name ||
        !email ||
        !password ||
        !grade
    ) {

        showMessage(
            "Please fill in all student information.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showMessage(
            "Password must be at least 6 characters.",
            "error"
        );

        return;
    }


    if (
        !photoInput ||
        !photoInput.files ||
        photoInput.files.length === 0
    ) {

        showMessage(
            "Profile photo is required.",
            "error"
        );

        return;
    }


    const photoFile =
        photoInput.files[0];


    if (!photoFile.type.startsWith("image/")) {

        showMessage(
            "Please select an image file.",
            "error"
        );

        return;
    }


    if (photoFile.size > 5 * 1024 * 1024) {

        showMessage(
            "Profile photo must be less than 5 MB.",
            "error"
        );

        return;
    }


    try {

        const {
            auth,
            db,
            createUserWithEmailAndPassword,
            deleteUser,
            doc,
            setDoc
        } = window.firebaseFunctions;


        showMessage(
            "Creating student account...",
            "success"
        );


        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        try {

            showMessage(
                "Uploading profile photo...",
                "success"
            );


            const photoURL =
                await uploadProfilePhoto(
                    photoFile
                );


            showMessage(
                "Saving student information...",
                "success"
            );


            await setDoc(
                doc(
                    db,
                    "users",
                    user.uid
                ),
                {

                    uid:
                        user.uid,

                    name:
                        name,

                    email:
                        email,

                    grade:
                        grade,

                    role:
                        "student",

                    photoURL:
                        photoURL,

                    date:
                        new Date().toISOString()
                }
            );


            showMessage(
                "Student registration successful!",
                "success"
            );


            document.getElementById(
                "studentName"
            ).value = "";

            document.getElementById(
                "studentEmail"
            ).value = "";

            document.getElementById(
                "studentPassword"
            ).value = "";

            document.getElementById(
                "studentGrade"
            ).value = "";

            document.getElementById(
                "studentPhoto"
            ).value = "";


            const previewContainer =
                document.getElementById(
                    "studentPhotoPreviewContainer"
                );

            const preview =
                document.getElementById(
                    "studentPhotoPreview"
                );


            if (previewContainer) {
                previewContainer.style.display = "none";
            }

            if (preview) {
                preview.src = "";
            }


            showPage("homePage");


        } catch (error) {

            try {
                await deleteUser(user);
            } catch (deleteError) {
                console.error(
                    "Delete user error:",
                    deleteError
                );
            }

            throw error;
        }


    } catch (error) {

        console.error(
            "Student registration error:",
            error
        );


        if (
            error.code ===
            "auth/email-already-in-use"
        ) {

            showMessage(
                "This email is already registered.",
                "error"
            );

        } else if (
            error.code ===
            "auth/invalid-email"
        ) {

            showMessage(
                "Please enter a valid email address.",
                "error"
            );

        } else if (
            error.code ===
            "auth/weak-password"
        ) {

            showMessage(
                "Password is too weak. Use at least 6 characters.",
                "error"
            );

        } else {

            showMessage(
                error.message ||
                "Student registration failed.",
                "error"
            );
        }
    }
}

window.registerStudent = registerStudent;


// ======================================
// STUDENT PHOTO PREVIEW
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const studentPhoto =
            document.getElementById("studentPhoto");

        if (!studentPhoto) return;


        studentPhoto.addEventListener(
            "change",
            function () {

                const file =
                    this.files[0];

                if (!file) return;


                if (!file.type.startsWith("image/")) {

                    showMessage(
                        "Please select an image file.",
                        "error"
                    );

                    this.value = "";

                    return;
                }


                if (file.size > 5 * 1024 * 1024) {

                    showMessage(
                        "Profile photo must be less than 5 MB.",
                        "error"
                    );

                    this.value = "";

                    return;
                }


                const preview =
                    document.getElementById(
                        "studentPhotoPreview"
                    );

                const container =
                    document.getElementById(
                        "studentPhotoPreviewContainer"
                    );


                if (preview && container) {

                    preview.src =
                        URL.createObjectURL(file);

                    container.style.display =
                        "block";
                }
            }
        );
    }
);


// ======================================
// LOGIN
// ======================================

async function login() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    try {
        // Firebase functions mirkaneessi
        if (!window.firebaseFunctions) {
            alert("Firebase is not loaded. Please check your Firebase setup.");
            return;
        }

        const {
            auth,
            signInWithEmailAndPassword
        } = window.firebaseFunctions;

        if (!auth || !signInWithEmailAndPassword) {
            alert("Firebase Authentication is not ready.");
            return;
        }

        console.log("Trying to login:", email);

        const result = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = result.user;

        console.log("Firebase login successful:", user.uid);

        // Firestore irraa profile dubbisi
        const {
            db,
            doc,
            getDoc
        } = window.firebaseFunctions;

        const userDoc = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!userDoc.exists()) {
            alert("Your Firebase account exists, but your user profile was not found.");
            return;
        }

        currentUser = {
            uid: user.uid,
            ...userDoc.data()
        };

        console.log("User profile:", currentUser);

        if (currentUser.role === "teacher") {

            document.getElementById("teacherWelcome").textContent =
                "Welcome, " + (currentUser.name || "Teacher");

            showPage("teacherDashboard");

        } else if (currentUser.role === "student") {

            document.getElementById("studentWelcome").textContent =
                "Welcome, " + (currentUser.name || "Student");

            showPage("studentDashboard");

        } else {

            alert("User role is missing or invalid.");

        }

    } catch (error) {

        console.error("Login error:", error);

        if (error.code === "auth/network-request-failed") {

            alert(
                "Firebase connection failed.\n\n" +
                "Please check your internet connection and make sure " +
                "Firebase Authentication is enabled."
            );

        } else if (error.code === "auth/invalid-credential") {

            alert("Email or password is incorrect.");

        } else if (error.code === "auth/user-not-found") {

            alert("No account was found with this email.");

        } else if (error.code === "auth/wrong-password") {

            alert("Incorrect password.");

        } else if (error.code === "auth/invalid-email") {

            alert("Please enter a valid email address.");

        } else {

            alert(
                "Login failed.\n\nFirebase error: " +
                (error.code || error.message)
            );
        }
    }
}
window.login = login;


// ======================================
// LOGOUT
// ======================================

async function logout() {

    try {

        const {
            auth,
            signOut
        } = window.firebaseFunctions;

        await signOut(auth);

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );
    }


    currentUser = null;
    currentQuiz = null;
    currentQuestions = [];
    messageUsers = [];

    quizExitHandled = true;
    quizAttemptRecorded = false;

    clearTimeout(quizExitTimer);

    stopCamera();

    showPage("homePage");

    showMessage(
        "Logged out.",
        "success"
    );
}

window.logout = logout;


// ======================================
// CREATE QUIZ
// ======================================

function openCreateQuiz() {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    if (currentUser.role !== "teacher") {

        showMessage(
            "Only teachers can create quizzes.",
            "error"
        );

        return;
    }


    currentQuestions = [];


    const title =
        document.getElementById(
            "quizTitle"
        );

    if (title) {
        title.value = "";
    }


    clearQuestionFields();

    updateQuestionCount();

    showPage("createQuiz");
}

window.openCreateQuiz = openCreateQuiz;


// ======================================
// CLEAR QUESTION FIELDS
// ======================================

function clearQuestionFields() {

    const ids = [
        "questionText",
        "optionA",
        "optionB",
        "optionC",
        "optionD"
    ];


    ids.forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }
    });


    const correctAnswer =
        document.getElementById(
            "correctAnswer"
        );

    if (correctAnswer) {
        correctAnswer.value = "";
    }
}

window.clearQuestionFields =
    clearQuestionFields;


// ======================================
// QUESTION COUNT
// ======================================

function updateQuestionCount() {

    const count =
        document.getElementById(
            "questionCount"
        );

    if (count) {

        count.innerText =
            currentQuestions.length;
    }
}

window.updateQuestionCount =
    updateQuestionCount;


// ======================================
// ADD QUESTION
// ======================================

function addQuestion() {

    const questionElement =
        document.getElementById(
            "questionText"
        );

    const AElement =
        document.getElementById(
            "optionA"
        );

    const BElement =
        document.getElementById(
            "optionB"
        );

    const CElement =
        document.getElementById(
            "optionC"
        );

    const DElement =
        document.getElementById(
            "optionD"
        );

    const correctElement =
        document.getElementById(
            "correctAnswer"
        );


    if (
        !questionElement ||
        !AElement ||
        !BElement ||
        !CElement ||
        !DElement ||
        !correctElement
    ) {

        showMessage(
            "Question fields were not found.",
            "error"
        );

        return;
    }


    const question =
        questionElement.value.trim();

    const A =
        AElement.value.trim();

    const B =
        BElement.value.trim();

    const C =
        CElement.value.trim();

    const D =
        DElement.value.trim();

    const correct =
        correctElement.value;


    if (
        !question ||
        !A ||
        !B ||
        !C ||
        !D ||
        !correct
    ) {

        showMessage(
            "Fill the question and all options.",
            "error"
        );

        return;
    }


    currentQuestions.push({

        text:
            question,

        A:
            A,

        B:
            B,

        C:
            C,

        D:
            D,

        correct:
            correct
    });


    updateQuestionCount();

    clearQuestionFields();

    showMessage(
        "Question added successfully.",
        "success"
    );
}

window.addQuestion = addQuestion;


// ======================================
// SAVE QUIZ
// ======================================

async function saveQuiz() {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    if (currentUser.role !== "teacher") {

        showMessage(
            "Only teachers can save quizzes.",
            "error"
        );

        return;
    }


    const titleElement =
        document.getElementById(
            "quizTitle"
        );


    if (!titleElement) {

        showMessage(
            "Quiz title field was not found.",
            "error"
        );

        return;
    }


    const title =
        titleElement.value.trim();


    if (!title) {

        showMessage(
            "Enter quiz title.",
            "error"
        );

        return;
    }


    if (currentQuestions.length === 0) {

        showMessage(
            "Add at least one question.",
            "error"
        );

        return;
    }


    try {

        const {
            db,
            doc,
            setDoc
        } = window.firebaseFunctions;


        const quizId =
            Date.now().toString();


        const quiz = {

            id:
                quizId,

            title:
                title,

            teacherUID:
                currentUser.uid,

            teacherEmail:
                currentUser.email,

            teacherName:
                currentUser.name,

            questions:
                currentQuestions,

            date:
                new Date().toISOString()
        };


        await setDoc(
            doc(
                db,
                "quizzes",
                quizId
            ),
            quiz
        );


        currentQuestions = [];

        updateQuestionCount();

        titleElement.value = "";

        clearQuestionFields();


        showMessage(
            "Quiz saved successfully!",
            "success"
        );


        showPage(
            "teacherDashboard"
        );


    } catch (error) {

        console.error(
            "Save quiz error:",
            error
        );


        showMessage(
            "Quiz could not be saved: " +
            error.message,
            "error"
        );
    }
}

window.saveQuiz = saveQuiz;


// ======================================
// AVAILABLE QUIZZES
// ======================================

async function showAvailableQuizzes() {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    if (currentUser.role !== "student") {

        showMessage(
            "Only students can take quizzes.",
            "error"
        );

        return;
    }


    try {

        const {
            db,
            getDocs,
            collection
        } = window.firebaseFunctions;


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "quizzes"
                )
            );


        const list =
            document.getElementById(
                "availableQuizList"
            );


        if (!list) {

            showMessage(
                "Quiz list area not found.",
                "error"
            );

            return;
        }


        list.innerHTML = "";


        if (snapshot.empty) {

            list.innerHTML =
                "<p>No quizzes available.</p>";

            showPage(
                "availableQuizzes"
            );

            return;
        }


        snapshot.forEach(
            docSnap => {

                const quiz =
                    docSnap.data();


                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "quiz-card";


                const quizId =
                    String(
                        quiz.id ||
                        docSnap.id
                    );


                const questionCount =
                    Array.isArray(
                        quiz.questions
                    )
                    ? quiz.questions.length
                    : 0;


                card.innerHTML = `

                    <h3>
                        ${escapeHTML(
                            quiz.title || ""
                        )}
                    </h3>

                    <p>
                        Teacher:
                        ${escapeHTML(
                            quiz.teacherName || ""
                        )}
                    </p>

                    <p>
                        Questions:
                        ${questionCount}
                    </p>

                    <button
                        type="button"
                        class="success"
                        data-quiz-id="${escapeHTML(
                            quizId
                        )}">
                        📝 Take Quiz
                    </button>
                `;


                const button =
                    card.querySelector("button");


                button.addEventListener(
                    "click",
                    () => {
                        startQuiz(quizId);
                    }
                );


                list.appendChild(card);
            }
        );


        showPage(
            "availableQuizzes"
        );


    } catch (error) {

        console.error(
            "Available quizzes error:",
            error
        );


        showMessage(
            "Could not load quizzes: " +
            error.message,
            "error"
        );
    }
}

window.showAvailableQuizzes =
    showAvailableQuizzes;


// ======================================
// START QUIZ
// ======================================

async function startQuiz(quizId) {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    if (currentUser.role !== "student") {

        showMessage(
            "Only students can take quizzes.",
            "error"
        );

        return;
    }


    try {

        const {
            db,
            doc,
            getDoc
        } = window.firebaseFunctions;


        const quizDoc =
            await getDoc(
                doc(
                    db,
                    "quizzes",
                    quizId
                )
            );


        if (!quizDoc.exists()) {

            showMessage(
                "Quiz not found.",
                "error"
            );

            return;
        }


        const quiz =
            quizDoc.data();


        if (
            !Array.isArray(
                quiz.questions
            ) ||
            quiz.questions.length === 0
        ) {

            showMessage(
                "This quiz has no questions.",
                "error"
            );

            return;
        }


        currentQuiz =
            quiz;


        quizPageWasHidden =
            false;

        quizExitHandled =
            false;

        quizAttemptRecorded =
            false;


        const title =
            document.getElementById(
                "takingQuizTitle"
            );


        if (title) {
            title.innerText =
                quiz.title || "Quiz";
        }


        const container =
            document.getElementById(
                "quizQuestions"
            );


        if (!container) {

            showMessage(
                "Quiz question area not found.",
                "error"
            );

            return;
        }


        container.innerHTML = "";


        quiz.questions.forEach(
            (question, index) => {

                const questionBox =
                    document.createElement(
                        "div"
                    );


                questionBox.className =
                    "question-box";


                questionBox.innerHTML = `

                    <h3>
                        ${index + 1}.
                        ${escapeHTML(
                            question.text
                        )}
                    </h3>

                    <label>
                        <input
                            type="radio"
                            name="question${index}"
                            value="A">
                        A.
                        ${escapeHTML(
                            question.A
                        )}
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="question${index}"
                            value="B">
                        B.
                        ${escapeHTML(
                            question.B
                        )}
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="question${index}"
                            value="C">
                        C.
                        ${escapeHTML(
                            question.C
                        )}
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="question${index}"
                            value="D">
                        D.
                        ${escapeHTML(
                            question.D
                        )}
                    </label>
                `;


                container.appendChild(
                    questionBox
                );
            }
        );


        showPage(
            "takeQuiz"
        );


    } catch (error) {

        console.error(
            "Start quiz error:",
            error
        );


        showMessage(
            "Could not open quiz: " +
            error.message,
            "error"
        );
    }
}

window.startQuiz = startQuiz;


// ======================================
// RECORD QUIZ ATTEMPT
// ======================================

async function recordQuizAttempt(status) {

    if (
        !currentQuiz ||
        !currentUser ||
        currentUser.role !== "student"
    ) {
        return;
    }


    if (quizAttemptRecorded) {
        return;
    }


    quizAttemptRecorded = true;


    try {

        const {
            db,
            doc,
            setDoc
        } = window.firebaseFunctions;


        const attemptId =
            currentUser.uid +
            "_" +
            currentQuiz.id +
            "_" +
            Date.now();


        await setDoc(
            doc(
                db,
                "quizAttempts",
                attemptId
            ),
            {

                id:
                    attemptId,

                studentUID:
                    currentUser.uid,

                studentName:
                    currentUser.name || "",

                studentEmail:
                    currentUser.email || "",

                quizId:
                    currentQuiz.id,

                quizTitle:
                    currentQuiz.title || "",

                teacherUID:
                    currentQuiz.teacherUID || "",

                status:
                    status,

                date:
                    new Date().toISOString()
            }
        );


        console.log(
            "Quiz attempt recorded:",
            status
        );


    } catch (error) {

        console.error(
            "Could not record quiz attempt:",
            error
        );
    }
}


// ======================================
// SUBMIT QUIZ
// ======================================

async function submitQuiz() {

    if (!currentQuiz) {

        showMessage(
            "No quiz selected.",
            "error"
        );

        return;
    }


    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    if (currentUser.role !== "student") {

        showMessage(
            "Only students can submit quizzes.",
            "error"
        );

        return;
    }


    try {

        const {
            db,
            doc,
            setDoc
        } = window.firebaseFunctions;


        let score = 0;

        let answered = 0;


        currentQuiz.questions.forEach(
            (question, index) => {

                const selected =
                    document.querySelector(
                        `input[name="question${index}"]:checked`
                    );


                if (selected) {

                    answered++;


                    if (
                        selected.value ===
                        question.correct
                    ) {

                        score++;
                    }
                }
            }
        );


        const total =
            currentQuiz.questions.length;


        const resultId =
            currentUser.uid +
            "_" +
            currentQuiz.id +
            "_" +
            Date.now();


        const result = {

            id:
                resultId,

            quizId:
                currentQuiz.id,

            quizTitle:
                currentQuiz.title,

            teacherUID:
                currentQuiz.teacherUID,

            studentUID:
                currentUser.uid,

            studentName:
                currentUser.name,

            studentEmail:
                currentUser.email,

            score:
                score,

            total:
                total,

            answered:
                answered,

            date:
                new Date().toISOString()
        };


        await setDoc(
            doc(
                db,
                "results",
                resultId
            ),
            result
        );


        quizExitHandled =
            true;

        quizAttemptRecorded =
            true;

        clearTimeout(
            quizExitTimer
        );


        showMessage(
            `Quiz submitted! Score: ${score}/${total}`,
            "success"
        );


        currentQuiz =
            null;


        showPage(
            "studentResults"
        );


        await showStudentResults();


    } catch (error) {

        console.error(
            "Submit quiz error:",
            error
        );


        showMessage(
            "Could not submit quiz: " +
            error.message,
            "error"
        );
    }
}

window.submitQuiz =
    submitQuiz;


// ======================================
// STUDENT RESULTS
// ======================================

async function showStudentResults() {

    if (
        !currentUser ||
        currentUser.role !== "student"
    ) {

        showMessage(
            "Student qofaaf!",
            "error"
        );

        return;
    }


    showPage(
        "studentResults"
    );


    // IMPORTANT:
    // HTML keessatti ID isaa studentResultList dha.

    const list =
        document.getElementById(
            "studentResultList"
        );


    if (!list) {

        showMessage(
            "Student result list area was not found.",
            "error"
        );

        return;
    }


    list.innerHTML =
        "<p>Loading results...</p>";


    try {

        const {
            db,
            collection,
            getDocs,
            query,
            where
        } = window.firebaseFunctions;


        const resultsQuery =
            query(
                collection(
                    db,
                    "results"
                ),
                where(
                    "studentUID",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(
                resultsQuery
            );


        if (snapshot.empty) {

            list.innerHTML =
                "<p>No results yet.</p>";

            return;
        }


        const results = [];


        snapshot.forEach(
            docSnap => {

                results.push(
                    docSnap.data()
                );
            }
        );


        results.sort(
            (a, b) =>
                new Date(
                    b.date || 0
                ) -
                new Date(
                    a.date || 0
                )
        );


        list.innerHTML = "";


        results.forEach(
            result => {

                const score =
                    Number(
                        result.score || 0
                    );

                const total =
                    Number(
                        result.total || 0
                    );


                const percentage =
                    total > 0
                    ? Math.round(
                        (
                            score /
                            total
                        ) * 100
                    )
                    : 0;


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "result-card";


                card.innerHTML = `

                    <h3>
                        ${escapeHTML(
                            result.quizTitle ||
                            "Quiz"
                        )}
                    </h3>

                    <p>
                        Score:
                        <strong>
                            ${score}/${total}
                        </strong>
                    </p>

                    <p>
                        Percentage:
                        <strong>
                            ${percentage}%
                        </strong>
                    </p>

                    <p>
                        Answered:
                        ${Number(
                            result.answered || 0
                        )}/${total}
                    </p>

                    <p>
                        Date:
                        ${
                            result.date
                            ? escapeHTML(
                                new Date(
                                    result.date
                                ).toLocaleString()
                              )
                            : "Unknown"
                        }
                    </p>
                `;


                list.appendChild(
                    card
                );
            }
        );


    } catch (error) {

        console.error(
            "Student results error:",
            error
        );


        list.innerHTML =
            "<p>Results could not be loaded.</p>";


        showMessage(
            error.message,
            "error"
        );
    }
}

window.showStudentResults =
    showStudentResults;


// ======================================
// TEACHER RESULTS
// ======================================

async function viewResults() {

    if (
        !currentUser ||
        currentUser.role !== "teacher"
    ) {

        showMessage(
            "Only teachers can view results.",
            "error"
        );

        return;
    }


    showPage(
        "teacherResults"
    );


    // IMPORTANT:
    // HTML keessatti teacherResultList dha.

    const container =
        document.getElementById(
            "teacherResultList"
        );


    if (!container) {

        showMessage(
            "Teacher result list area was not found.",
            "error"
        );

        return;
    }


    container.innerHTML =
        "<p>Loading results...</p>";


    try {

        const {
            db,
            collection,
            getDocs,
            query,
            where
        } = window.firebaseFunctions;


        const resultsQuery =
            query(
                collection(
                    db,
                    "results"
                ),
                where(
                    "teacherUID",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(
                resultsQuery
            );


        if (snapshot.empty) {

            container.innerHTML = `

                <div class="empty-box">

                    <h3>
                        No Results Yet
                    </h3>

                    <p>
                        No students have submitted
                        your quizzes yet.
                    </p>

                </div>
            `;

            return;
        }


        const results = [];


        snapshot.forEach(
            docSnap => {

                results.push({

                    id:
                        docSnap.id,

                    ...docSnap.data()
                });
            }
        );


        results.sort(
            (a, b) =>
                new Date(
                    b.date || 0
                ) -
                new Date(
                    a.date || 0
                )
        );


        container.innerHTML =
            "";


        results.forEach(
            result => {

                const score =
                    Number(
                        result.score || 0
                    );

                const total =
                    Number(
                        result.total || 0
                    );


                const percentage =
                    total > 0
                    ? Math.round(
                        (
                            score /
                            total
                        ) * 100
                    )
                    : 0;


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "result-card";


                card.innerHTML = `

                    <h3>
                        ${escapeHTML(
                            result.studentName ||
                            "Student"
                        )}
                    </h3>

                    <p>
                        <strong>
                            Quiz:
                        </strong>
                        ${escapeHTML(
                            result.quizTitle ||
                            "Unknown Quiz"
                        )}
                    </p>

                    <p>
                        <strong>
                            Score:
                        </strong>
                        ${score}/${total}
                    </p>

                    <p>
                        <strong>
                            Percentage:
                        </strong>
                        ${percentage}%
                    </p>

                    <p>
                        <strong>
                            Answered:
                        </strong>
                        ${Number(
                            result.answered || 0
                        )}/${total}
                    </p>

                    <p>
                        <strong>
                            Email:
                        </strong>
                        ${escapeHTML(
                            result.studentEmail || ""
                        )}
                    </p>

                    <p>
                        <strong>
                            Date:
                        </strong>
                        ${
                            result.date
                            ? escapeHTML(
                                new Date(
                                    result.date
                                ).toLocaleString()
                              )
                            : "Unknown"
                        }
                    </p>
                `;


                container.appendChild(
                    card
                );
            }
        );


    } catch (error) {

        console.error(
            "Teacher results error:",
            error
        );


        container.innerHTML = `

            <div class="error-box">

                <p>
                    Teacher results could not be loaded.
                </p>

            </div>
        `;


        showMessage(
            "Teacher results could not be loaded. Check Firestore Rules.",
            "error"
        );
    }
}

window.viewResults =
    viewResults;


// ======================================
// STUDENTS
// ======================================

async function showStudents() {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    if (currentUser.role !== "teacher") {

        showMessage(
            "Only teachers can view students.",
            "error"
        );

        return;
    }


    try {

        const {
            db,
            getDocs,
            collection
        } = window.firebaseFunctions;


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "users"
                )
            );


        const list =
            document.getElementById(
                "studentList"
            );


        if (!list) {

            showMessage(
                "Student list area not found.",
                "error"
            );

            return;
        }


        list.innerHTML = "";

        let found = false;


        snapshot.forEach(
            docSnap => {

                const user =
                    docSnap.data();


                if (
                    user.role ===
                    "student"
                ) {

                    found = true;


                    const card =
                        document.createElement(
                            "div"
                        );


                    card.className =
                        "quiz-card";


                    card.innerHTML = `

                        ${
                            user.photoURL
                            ? `
                                <img
                                    src="${escapeHTML(
                                        user.photoURL
                                    )}"
                                    alt="Student"
                                    style="
                                        width:80px;
                                        height:80px;
                                        object-fit:cover;
                                        border-radius:50%;
                                    "
                                >
                              `
                            : ""
                        }

                        <h3>
                            ${escapeHTML(
                                user.name || ""
                            )}
                        </h3>

                        <p>
                            Email:
                            ${escapeHTML(
                                user.email || ""
                            )}
                        </p>

                        <p>
                            Grade:
                            ${escapeHTML(
                                user.grade || ""
                            )}
                        </p>
                    `;


                    list.appendChild(
                        card
                    );
                }
            }
        );


        if (!found) {

            list.innerHTML =
                "<p>No students registered yet.</p>";
        }


        showPage(
            "studentsPage"
        );


    } catch (error) {

        console.error(
            "Students error:",
            error
        );


        showMessage(
            "Could not load students: " +
            error.message,
            "error"
        );
    }
}

window.showStudents =
    showStudents;


function viewStudents() {
    showStudents();
}

window.viewStudents =
    viewStudents;


// ======================================
// MESSAGE SYSTEM
// ======================================

async function openMessages() {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    showPage(
        "messagesPage"
    );


    // IMPORTANT:
    // HTML keessatti messagePerson dha.

    const select =
        document.getElementById(
            "messagePerson"
        );


    if (!select) {

        showMessage(
            "Message person field was not found.",
            "error"
        );

        return;
    }


    select.innerHTML =
        '<option value="">Select person</option>';

    messageUsers = [];


    try {

        const {
            db,
            collection,
            getDocs,
            query,
            where
        } = window.firebaseFunctions;


        const targetRole =
            currentUser.role === "teacher"
            ? "student"
            : "teacher";


        const usersQuery =
            query(
                collection(
                    db,
                    "users"
                ),
                where(
                    "role",
                    "==",
                    targetRole
                )
            );


        const snapshot =
            await getDocs(
                usersQuery
            );


        if (snapshot.empty) {

            showMessage(
                "No users found.",
                "warning"
            );

            await showMessages();

            return;
        }


        snapshot.forEach(
            docSnap => {

                if (
                    docSnap.id ===
                    currentUser.uid
                ) {
                    return;
                }


                const user =
                    docSnap.data();


                const person = {

                    uid:
                        docSnap.id,

                    name:
                        user.name ||
                        "Unknown User",

                    email:
                        user.email ||
                        "",

                    role:
                        user.role ||
                        targetRole,

                    photo:
                        user.photoURL ||
                        ""
                };


                messageUsers.push(
                    person
                );


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    person.uid;


                option.textContent =
                    person.name +
                    (
                        person.email
                        ? " - " + person.email
                        : ""
                    );


                select.appendChild(
                    option
                );
            }
        );


        await showMessages();


    } catch (error) {

        console.error(
            "openMessages error:",
            error
        );


        showMessage(
            "Could not load users: " +
            error.message,
            "error"
        );
    }
}

window.openMessages =
    openMessages;


// ======================================
// SEND MESSAGE
// ======================================

async function sendMessage() {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    const recipientElement =
        document.getElementById(
            "messagePerson"
        );


    const textElement =
        document.getElementById(
            "messageText"
        );


    if (!recipientElement) {

        showMessage(
            "Message person field was not found.",
            "error"
        );

        return;
    }


    if (!textElement) {

        showMessage(
            "Message text field was not found.",
            "error"
        );

        return;
    }


    const recipientUID =
        recipientElement.value;


    const text =
        textElement.value.trim();


    if (!recipientUID) {

        showMessage(
            "Please select a person.",
            "warning"
        );

        return;
    }


    if (!text) {

        showMessage(
            "Please write a message.",
            "warning"
        );

        return;
    }


    const recipient =
        messageUsers.find(
            user =>
                user.uid ===
                recipientUID
        );


    if (!recipient) {

        showMessage(
            "Recipient was not found.",
            "error"
        );

        return;
    }


    try {

        const {
            db,
            doc,
            setDoc,
            collection
        } = window.firebaseFunctions;


        const messageRef =
            doc(
                collection(
                    db,
                    "messages"
                )
            );


        const messageData = {

            fromUID:
                currentUser.uid,

            fromName:
                currentUser.name || "",

            fromRole:
                currentUser.role || "",

            toUID:
                recipient.uid,

            toName:
                recipient.name || "",

            toRole:
                recipient.role || "",

            text:
                text,

            createdAt:
                new Date().toISOString(),

            read:
                false
        };


        await setDoc(
            messageRef,
            messageData
        );


        textElement.value = "";


        showMessage(
            "Message sent successfully.",
            "success"
        );


        await showMessages();


    } catch (error) {

        console.error(
            "sendMessage error:",
            error
        );


        showMessage(
            "Message could not be sent: " +
            error.message,
            "error"
        );
    }
}

window.sendMessage =
    sendMessage;


// ======================================
// SHOW MESSAGES
// ======================================

async function showMessages() {

    if (!currentUser) {
        return;
    }


    // IMPORTANT:
    // HTML keessatti messageList dha.

    const container =
        document.getElementById(
            "messageList"
        );


    if (!container) {

        console.error(
            "messageList not found."
        );

        return;
    }


    container.innerHTML =
        "<p>Loading messages...</p>";


    try {

        const {
            db,
            collection,
            getDocs,
            query,
            where
        } = window.firebaseFunctions;


        const receivedQuery =
            query(
                collection(
                    db,
                    "messages"
                ),
                where(
                    "toUID",
                    "==",
                    currentUser.uid
                )
            );


        const sentQuery =
            query(
                collection(
                    db,
                    "messages"
                ),
                where(
                    "fromUID",
                    "==",
                    currentUser.uid
                )
            );


        const [
            receivedSnapshot,
            sentSnapshot
        ] =
            await Promise.all([

                getDocs(
                    receivedQuery
                ),

                getDocs(
                    sentQuery
                )
            ]);


        const messages = [];


        receivedSnapshot.forEach(
            docSnap => {

                messages.push({

                    id:
                        docSnap.id,

                    ...docSnap.data(),

                    direction:
                        "received"
                });
            }
        );


        sentSnapshot.forEach(
            docSnap => {

                messages.push({

                    id:
                        docSnap.id,

                    ...docSnap.data(),

                    direction:
                        "sent"
                });
            }
        );


        if (messages.length === 0) {

            container.innerHTML =
                "<p>No messages yet.</p>";

            return;
        }


        messages.sort(
            (a, b) =>
                new Date(
                    b.createdAt || 0
                ) -
                new Date(
                    a.createdAt || 0
                )
        );


        container.innerHTML =
            "";


        messages.forEach(
            message => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    message.direction === "sent"
                    ? "message sent-message"
                    : "message received-message";


                const otherName =
                    message.direction === "sent"
                    ? (
                        message.toName ||
                        "User"
                    )
                    : (
                        message.fromName ||
                        "User"
                    );


                const label =
                    message.direction === "sent"
                    ? "You"
                    : otherName;


                const time =
                    message.createdAt
                    ? new Date(
                        message.createdAt
                      ).toLocaleString()
                    : "";


                const nameElement =
                    document.createElement(
                        "strong"
                    );


                nameElement.textContent =
                    label;


                const textElement =
                    document.createElement(
                        "p"
                    );


                textElement.textContent =
                    message.text || "";


                const timeElement =
                    document.createElement(
                        "small"
                    );


                timeElement.textContent =
                    time;


                item.appendChild(
                    nameElement
                );

                item.appendChild(
                    textElement
                );

                item.appendChild(
                    timeElement
                );


                container.appendChild(
                    item
                );
            }
        );


    } catch (error) {

        console.error(
            "showMessages error:",
            error
        );


        container.innerHTML =
            "<p>Could not load messages.</p>";


        showMessage(
            "Could not load messages: " +
            error.message,
            "error"
        );
    }
}

window.showMessages =
    showMessages;


// ======================================
// VIDEO CHAT
// ======================================

function openVideoChat() {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    showPage(
        "videoChatPage"
    );

 }
window.openVideoChat =
    openVideoChat;


// ======================================
// START VIDEOCHAT
// ======================================

async function startVideoCall() {

    const video = document.getElementById("localVideo");

    if (!video) {
        showMessage("Video element not found.", "error");
        return;
    }

    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

        showMessage(
            "Camera is not available in this environment.",
            "error"
        );

        return;
    }

    try {

        // Camera duraan baname yoo jiraate cufi
        if (videoStream) {
            videoStream.getTracks().forEach(track => {
                track.stop();
            });

            videoStream = null;
        }

        // Camera fi microphone gaafadhu
        const stream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

        videoStream = stream;

        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        await video.play();

        showMessage(
            "Video call started.",
            "success"
        );

        console.log("Video call started.");

    } catch (error) {

        console.error("Video call error:", error);

        if (error.name === "NotAllowedError") {

            showMessage(
                "Camera or microphone permission was denied.",
                "error"
            );

        } else if (error.name === "NotFoundError") {

            showMessage(
                "Camera or microphone was not found.",
                "error"
            );

        } else if (error.name === "NotReadableError") {

            showMessage(
                "Camera is being used by another application.",
                "error"
            );

        } else {

            showMessage(
                "Unable to start video call.",
                "error"
            );
        }
    }
}


function endVideoCall() {

    const video = document.getElementById("localVideo");

    if (videoStream) {

        videoStream.getTracks().forEach(track => {
            track.stop();
        });

        videoStream = null;
    }

    if (video) {
        video.srcObject = null;
    }

    showMessage(
        "Video call ended.",
        "success"
    );

    console.log("Video call ended.");
}


// Compatibility with the old Camera buttons
function startCamera() {
    return startVideoCall();
}

function stopCamera() {
    endVideoCall();
}


// Make functions available to HTML onclick
window.startVideoCall = startVideoCall;
window.endVideoCall = endVideoCall;
window.startCamera = startCamera;
window.stopCamera = stopCamera;
// ======================================
// BACK TO DASHBOARD
// ======================================

function goBackDashboard() {

    stopCamera();


    if (!currentUser) {

        showPage(
            "homePage"
        );

        return;
    }


    if (
        currentUser.role ===
        "teacher"
    ) {

        showPage(
            "teacherDashboard"
        );

    } else {

        showPage(
            "studentDashboard"
        );
    }
}

window.goBackDashboard =
    goBackDashboard;


// ======================================
// SAVE SYSTEM DATA
// ======================================

function saveSystemData() {

    const backup = {

        savedAt:
            new Date().toISOString(),

        note:
            "Firebase is the main database. This is only a local backup record.",

        currentUser:
            currentUser
            ? {

                uid:
                    currentUser.uid,

                role:
                    currentUser.role,

                name:
                    currentUser.name,

                email:
                    currentUser.email
            }
            : null
    };


    localStorage.setItem(
        "system_backup",
        JSON.stringify(
            backup
        )
    );


    showMessage(
        "Local backup information saved successfully!",
        "success"
    );
}

window.saveSystemData =
    saveSystemData;


// ======================================
// QUIZ LEAVE DETECTION
// ======================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "hidden"
        ) {

            if (
                currentQuiz &&
                currentUser &&
                currentUser.role === "student" &&
                !quizExitHandled
            ) {

                quizPageWasHidden =
                    true;


                clearTimeout(
                    quizExitTimer
                );


                quizExitTimer =
                    setTimeout(
                        async () => {

                            if (
                                currentQuiz &&
                                !quizExitHandled &&
                                quizPageWasHidden
                            ) {

                                await recordQuizAttempt(
                                    "Student left quiz"
                                );
                            }

                        },
                        1500
                    );
            }


        } else {

            if (
                quizPageWasHidden &&
                currentQuiz
            ) {

                quizPageWasHidden =
                    false;


                clearTimeout(
                    quizExitTimer
                );
            }
        }
    }
);


// ======================================
// PAGEHIDE
// ======================================

window.addEventListener(
    "pagehide",
    () => {

        if (
            currentUser &&
            currentUser.role === "student" &&
            currentQuiz &&
            !quizExitHandled &&
            !quizAttemptRecorded
        ) {

            recordQuizAttempt(
                "Student closed or left quiz"
            );
        }
    }
);


// ======================================
// MY QUIZZES
// ======================================

async function showMyQuizzes() {

    if (!currentUser) {

        showMessage(
            "Please login first.",
            "error"
        );

        return;
    }


    if (
        currentUser.role !==
        "teacher"
    ) {

        showMessage(
            "Only teachers can view quizzes.",
            "error"
        );

        return;
    }


    try {

        const {
            db,
            getDocs,
            collection
        } = window.firebaseFunctions;


        showPage(
            "myQuizzes"
        );


        // IMPORTANT:
        // HTML keessatti quizList dha.

        const list =
            document.getElementById(
                "quizList"
            );


        if (!list) {

            showMessage(
                "Quiz list area was not found.",
                "error"
            );

            return;
        }


        list.innerHTML =
            "<p>Loading your quizzes...</p>";


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "quizzes"
                )
            );


        const quizzes = [];


        snapshot.forEach(
            docSnap => {

                const quiz =
                    docSnap.data();


                if (
                    quiz.teacherUID ===
                    currentUser.uid
                ) {

                    quizzes.push(
                        quiz
                    );
                }
            }
        );


        quizzes.sort(
            (a, b) =>
                new Date(
                    b.date || 0
                ) -
                new Date(
                    a.date || 0
                )
        );


        if (
            quizzes.length === 0
        ) {

            list.innerHTML = `

                <div class="quiz-card">

                    <h3>
                        No Quizzes Yet
                    </h3>

                    <p>
                        You have not created
                        any quizzes yet.
                    </p>

                </div>
            `;

            return;
        }


        list.innerHTML =
            "";


        quizzes.forEach(
            quiz => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "quiz-card";


                const questionCount =
                    Array.isArray(
                        quiz.questions
                    )
                    ? quiz.questions.length
                    : 0;


                card.innerHTML = `

                    <h3>
                        📚 ${escapeHTML(
                            quiz.title ||
                            "Untitled Quiz"
                        )}
                    </h3>

                    <p>
                        📝 Questions:
                        <strong>
                            ${questionCount}
                        </strong>
                    </p>

                    <p>
                        👨‍🏫 Teacher:
                        ${escapeHTML(
                            quiz.teacherName ||
                            currentUser.name ||
                            ""
                        )}
                    </p>

                    <p>
                        📅 Created:
                        ${
                            quiz.date
                            ? escapeHTML(
                                new Date(
                                    quiz.date
                                ).toLocaleString()
                              )
                            : "Unknown"
                        }
                    </p>
                `;


                list.appendChild(
                    card
                );
            }
        );


    } catch (error) {

        console.error(
            "MY QUIZZES ERROR:",
            error
        );


        showMessage(
            "Could not load your quizzes: " +
            error.message,
            "error"
        );
    }
}

window.showMyQuizzes =
    showMyQuizzes;


// ======================================
// QUIZ ATTEMPTS
// ======================================

async function showQuizAttempts() {

    if (!currentUser || currentUser.role !== "teacher") {
        alert("Only teachers can view quiz attempts.");
        return;
    }

    try {

        const {
            db,
            collection,
            query,
            where,
            getDocs
        } = window.firebaseFunctions;

        const attemptsRef = collection(db, "quizAttempts");

        // ONLY this teacher's attempts
        const q = query(
            attemptsRef,
            where("teacherUID", "==", currentUser.uid)
        );

        const snapshot = await getDocs(q);

        const list = document.getElementById("quizAttemptsList");

        if (!list) {
            console.error("quizAttemptsList not found.");
            return;
        }

        list.innerHTML = "";

        if (snapshot.empty) {

            list.innerHTML = `
                <div class="empty-box">
                    No quiz attempts found.
                </div>
            `;

            showPage("quizAttemptsPage");
            return;
        }

        snapshot.forEach((docSnap) => {

            const attempt = docSnap.data();

            const item = document.createElement("div");

            item.className = "result-card";

            item.innerHTML = `
                <h3>${escapeHTML(attempt.quizTitle || "Quiz")}</h3>

                <p>
                    <strong>Student:</strong>
                    ${escapeHTML(attempt.studentName || "Unknown")}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${escapeHTML(attempt.studentEmail || "")}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escapeHTML(attempt.status || "Left quiz")}
                </p>

                <p>
                    <strong>Date:</strong>
                    ${attempt.date
                        ? new Date(attempt.date).toLocaleString()
                        : "Unknown"}
                </p>
            `;

            list.appendChild(item);
        });

        showPage("quizAttemptsPage");

    } catch (error) {

        console.error("Quiz attempts error:", error);

        alert(
            "Quiz Attempts hin banamne.\n\n" +
            "Firebase error: " +
            (error.code || error.message)
        );
    }
}
window.showQuizAttempts =
    showQuizAttempts;


// ======================================
// INITIAL PAGE
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const activePage =
            document.querySelector(
                ".page.active"
            );


        if (!activePage) {

            const home =
                document.getElementById(
                    "homePage"
                );


            if (home) {

                home.classList.add(
                    "active"
                );
            }
        }
    }
    );
