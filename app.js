let currentExamId = '';
let currentQuestionIndex = 0;
let totalQuestions = 0;
const API_URL = 'https://script.google.com/macros/s/AKfycbwP2m20Mb3Jkmp351o-l4NV9j7B8bDytq229agCj53j3OZV0jX-ONCkv7ES03zARvtsWg/exec';

async function startExam() {
  currentExamId = document.getElementById('examId').value;
  if (!currentExamId) {
    alert('Please enter an Exam ID');
    return;
  }
  currentQuestionIndex = 0;
  await loadQuestion();
}

async function loadQuestion() {
  try {
    const response = await fetch(`${API_URL}?action=getExam&examId=${currentExamId}&questionIndex=${currentQuestionIndex}`);
    const data = await response.json();

    if (data.error) {
      document.getElementById('questionContainer').innerHTML = `<p class="text-danger">${data.error}</p>`;
      return;
    }

    totalQuestions = data.totalQuestions;
    document.getElementById('questionContainer').innerHTML = `
      <h3>Question ${currentQuestionIndex + 1}</h3>
      <p>${data.question}</p>
    `;

    // Load PDF with pdf.js (all pages)
    if (data.pdf_link && data.pdf_link.includes('raw.githubusercontent.com')) {
      document.getElementById('pdfViewer').innerHTML = '';
      pdfjsLib.getDocument(data.pdf_link).promise.then(pdf => {
        const numPages = pdf.numPages;
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          pdf.getPage(pageNum).then(page => {
            const canvas = document.createElement('canvas');
            canvas.style.marginBottom = '20px';
            document.getElementById('pdfViewer').appendChild(canvas);
            const context = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 1.5 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            page.render({ canvasContext: context, viewport: viewport });
          });
        }
      }).catch(error => {
        console.error('PDF Error:', error);
        document.getElementById('pdfViewer').innerHTML = `<p class="text-danger">Error loading PDF: ${error.message}</p>`;
      });
    } else {
      document.getElementById('pdfViewer').innerHTML = `<p class="text-warning">No PDF available or invalid link</p>`;
    }

    // Resource download link
    if (data.resource_link && data.resource_link.includes('raw.githubusercontent.com')) {
      const downloadBtn = document.getElementById('resourceDownload');
      downloadBtn.href = data.resource_link;
      downloadBtn.style.display = 'block';
      downloadBtn.innerHTML = 'Download Resource';
    } else {
      document.getElementById('resourceDownload').style.display = 'none';
      document.getElementById('questionContainer').innerHTML += `<p class="text-warning">Invalid or missing resource link</p>`;
    }

    // Show/hide navigation buttons
    document.getElementById('prevBtn').style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    document.getElementById('nextBtn').style.display = currentQuestionIndex < totalQuestions - 1 ? 'inline-block' : 'none';
  } catch (error) {
    console.error('Error loading question:', error);
    document.getElementById('questionContainer').innerHTML = `<p class="text-danger">Error loading question: ${error.message}</p>`;
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
  }
}

function nextQuestion() {
  if (currentQuestionIndex < totalQuestions - 1) {
    currentQuestionIndex++;
    loadQuestion();
  }
}