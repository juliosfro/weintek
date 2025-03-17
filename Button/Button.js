let canvas = new Canvas();
let mouseArea = new MouseArea();

this.widget.add(canvas);
this.widget.add(mouseArea);

// Variavel para controlar o estado do botao
let isOn = false;

// Funcao para desenhar o botao
function drawButton() {
  // Define a posicao e tamanho do botao
  const buttonWidth = 100;
  const buttonHeight = 80;
  const x = 10;
  const y = 10;

  // Cria o gradiente de fundo
  const grd = canvas.createLinearGradient(x, y, x + buttonWidth, y);
  grd.addColorStop(0, isOn ? "#4CAF50" : "#f44336"); // Verde se ligado, vermelho se desligado
  grd.addColorStop(1, isOn ? "#81C784" : "#FF6659"); // Tom mais claro para suavizar

  // Preenche o fundo do botao com gradiente
  canvas.fillStyle = grd;
  canvas.fillRect(x, y, buttonWidth, buttonHeight); // Usando fillRect para bordas retas

  // Desenha a borda do botao
  canvas.lineWidth = 4;
  canvas.strokeStyle = "#333"; // Cor da borda
  canvas.strokeRect(x, y, buttonWidth, buttonHeight); // Borda reta, sem cantos arredondados

  // Desenha o texto no botao
  canvas.font = "20px Arial";
  canvas.fillStyle = "#fff"; // Cor do texto sempre branco
  canvas.textAlign = "center";
  canvas.textBaseline = "middle";
  canvas.fillText(isOn ? "Ligado" : "Desligado", x + buttonWidth / 2, y + buttonHeight / 2);
}

// Desenha o botao inicialmente
drawButton();

// Detecta o clique do mouse na area do botao
mouseArea.on('mousedown', (mouseEvent) => {
  const buttonWidth = 100;
  const buttonHeight = 80;
  const x = 10;
  const y = 10;

  if (mouseEvent.x >= x && mouseEvent.x <= x + buttonWidth && mouseEvent.y >= y && mouseEvent.y <= y + buttonHeight) {
    // Alterna o estado do botao
    isOn = !isOn;
    console.log('Botao clicado');
    drawButton(); // Redesenha o botao com o novo estado
  }
});