const textDisplay = document.getElementById('auto_type');
const phrases = ['Software Engineer', 'Web Developer', 'Cyber Enthusiast', 'UI/UX Designer'];
let currentPhrase = [];
let isDeleting = isEnd = false;

let i = 0, j = 0;
function loop () {
  isEnd = false;
  textDisplay.innerHTML = currentPhrase.join('');

  if (i < phrases.length) {

    if (!isDeleting && j <= phrases[i].length) {
      currentPhrase.push(phrases[i][j]);
      j++;
      textDisplay.innerHTML = currentPhrase.join('');
    }

    if(isDeleting && j <= phrases[i].length) {
      currentPhrase.pop(phrases[i][j]);
      j--;
      textDisplay.innerHTML = currentPhrase.join('');
    }

    if (j == phrases[i].length) {
      isEnd = true;
      isDeleting = true;
    }

    if (isDeleting && j === 0) {
      currentPhrase = [];
      isDeleting = false;
      i++;
      if (i === phrases.length) {
        i = 0;
      }
    }
  }
  const speedUp = Math.random() * (80 -50) + 50;
  const normalSpeed = Math.random() * (300 -200) + 100;
  const time = isEnd ? 2000 : isDeleting ? speedUp : normalSpeed;
  setTimeout(loop, time)
}

loop()
