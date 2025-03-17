const canvas = new Canvas();

// Definindo as dimensões do gráfico
const canvasWidth = 600;
const canvasHeight = 400;
const context = canvas.getContext('2d');

// Dados do gráfico (temperaturas)
const data = [
    { y: -5 },
    { y: 0 },
    { y: 5 },
    { y: 10 },
    { y: 15 },
    { y: 20 },
    { y: 25 },
    { y: 30 },
    { y: 35 },
];

// Pegando apenas os últimos 8 valores
const last8Data = data.slice(-8);

// Definir a largura das barras
const barWidth = 50;
const gap = 10; // Espaço entre as barras
const xOffset = 100; // Posição inicial no eixo X (ajustado para espaço para a escala)
const maxHeight = canvasHeight - 50; // Máxima altura para as barras (ajustado para espaço para a escala Y)

const axisOffset = 50; // Espaço para a escala no eixo Y

const minTemperature = -60; // Temperatura mínima
const maxTemperature = 40; // Temperatura máxima

// Função para desenhar a escala no eixo Y
function drawYAxis() {
    const step = 10; // Passo de 10 para a escala

    // Desenhando a linha do eixo Y
    context.strokeStyle = "#333"; // Cor da linha da escala (cinza mais forte)
    context.beginPath();
    context.moveTo(axisOffset, 0);
    context.lineTo(axisOffset, canvasHeight - 30); // Linha vertical para o eixo Y
    context.stroke();

    // Desenhando as linhas horizontais e os valores
    for (let i = minTemperature; i <= maxTemperature; i += step) {
        const yPosition = canvasHeight - ((i - minTemperature) / (maxTemperature - minTemperature)) * maxHeight - 30;

        context.beginPath();
        context.moveTo(axisOffset - 5, yPosition); // Linha horizontal
        context.lineTo(canvasWidth, yPosition);
        context.strokeStyle = "rgba(0, 0, 0, 0.3)"; // Linha de grade mais forte
        context.lineWidth = 1;
        context.stroke();

        // Desenhando os valores na escala
        context.fillStyle = "#333"; // Cor dos números na escala
        context.font = "12px Arial";
        context.fillText(i, axisOffset - 40, yPosition + 4);
    }
}

// Função para desenhar a legenda
function drawLegend() {
    const legendX = axisOffset; // Ajustado para 60px a menos
    const legendY = canvasHeight - 30; // Inicializa a posição Y para a legenda

    // Desenhando o retângulo para a temperatura
    context.fillStyle = "red";
    context.fillRect(legendX, legendY + 10, 20, 20);
    context.fillStyle = "#333"; // Cor do texto
    context.font = "12px Arial";
    context.fillText("Temperatura", legendX + 30, legendY + 25); // Texto ajustado para ficar abaixo

    // Desenhando o retângulo para a hora
    const legendX2 = legendX + 110; // Posicionando o segundo retângulo 110px à direita
    context.fillStyle = "blue";
    context.fillRect(legendX2, legendY + 10, 20, 20);
    context.fillStyle = "#333"; // Cor do texto
    context.font = "12px Arial";
    context.fillText("Hora", legendX2 + 30, legendY + 25); // Texto ajustado para ficar abaixo
}

// Função para desenhar o gráfico
function drawChart() {
    // Limpar o canvas
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    // Desenhando a escala no eixo Y
    drawYAxis();

    // Configurar o estilo da linha (vermelha)
    context.strokeStyle = "red"; // Linha vermelha para a temperatura
    context.lineWidth = 3; // Espessura da linha

    // Começar a desenhar a linha
    context.beginPath();

    // Definindo o tempo inicial para a hora
    const startTime = new Date(0); // Definindo o tempo inicial (horário 00:00:00)

    // Desenhando os pontos e a linha conectando-os
    last8Data.forEach((item, index) => {
        const x = xOffset + (barWidth + gap) * index + barWidth / 2;
        const y = canvasHeight - ((item.y - minTemperature) / (maxTemperature - minTemperature)) * maxHeight - 30;

        if (index === 0) {
            context.moveTo(x, y); // Move para o primeiro ponto
        } else {
            context.lineTo(x, y); // Desenha uma linha até o próximo ponto
        }

        // Calculando a hora correspondente ao dado
        const currentTime = new Date(startTime.getTime() + (index + (data.length - 8)) * 5 * 60000); // Cada índice corresponde a 5 minutos
        const hours = currentTime.getHours().toString().padStart(2, '0');
        const minutes = currentTime.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;

        // Desenhando o valor da temperatura acima de cada ponto, com o "°C" concatenado
        const valueY = y - 10; // Posição do valor acima do ponto
        context.fillStyle = "red"; // Cor do valor
        context.font = "12px Arial";
        context.fillText(`${item.y}°C`, x - context.measureText(`${item.y}°C`).width / 2, valueY); // Valor com "°C"

        // Desenhando a hora ao lado do valor da temperatura, 8px mais para baixo (cor azul)
        context.fillStyle = "blue"; // Cor da hora azul
        context.font = "12px Arial";
        context.fillText(timeString, x - context.measureText(timeString).width / 2, valueY + 28); // Hora 8px mais para baixo
    });

    // Finaliza a linha
    context.stroke();

    // Desenhando os círculos nos pontos de dados com borda suave
    last8Data.forEach((item, index) => {
        const x = xOffset + (barWidth + gap) * index + barWidth / 2;
        const y = canvasHeight - ((item.y - minTemperature) / (maxTemperature - minTemperature)) * maxHeight - 30;

        context.beginPath();
        context.arc(x, y, 6, 0, 2 * Math.PI); // Aumenta o raio para mais destaque
        context.fillStyle = "red"; // Cor do círculo
        context.fill();
        context.lineWidth = 2; // Borda do círculo
        context.strokeStyle = "#800000"; // Borda suave
        context.stroke();
    });

    // Desenhando a legenda
    drawLegend();
}

// Desenhando o gráfico
drawChart();
this.widget.add(context);
