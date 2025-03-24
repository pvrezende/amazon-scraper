// Importação de módulos necessários
const express = require('express'); // Framework web para Node.js
const axios = require('axios'); // Cliente HTTP para fazer requisições
const { JSDOM } = require('jsdom'); // Implementação do DOM para Node.js (para parsear HTML)
const cors = require('cors'); // Middleware para habilitar CORS (Cross-Origin Resource Sharing)
const path = require('path'); // Módulo para trabalhar com caminhos de arquivos
const fs = require('fs'); // Módulo para trabalhar com sistema de arquivos

// Criação da aplicação Express e definição da porta
const app = express();
const PORT = 3000;

// Configuração de caminhos
const PROJECT_ROOT = path.join(__dirname, '..'); // Pasta raiz do projeto (um nível acima)
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend'); // Caminho para a pasta frontend

// Verificação se a pasta frontend existe
if (!fs.existsSync(FRONTEND_DIR)) {
    console.error(`ERRO: Pasta frontend não encontrada em: ${FRONTEND_DIR}`);
    process.exit(1); // Encerra o processo com erro se a pasta não existir
}

// Configuração de middlewares
app.use(cors()); // Habilita CORS para todas as rotas
app.use(express.json()); // Permite parsing de JSON no corpo das requisições
app.use(express.static(FRONTEND_DIR)); // Serve arquivos estáticos da pasta frontend

// Rota principal - Serve o frontend
app.get('/', (req, res) => {
    const indexPath = path.join(FRONTEND_DIR, 'index.html');
    
    // Verifica se o arquivo index.html existe
    if (!fs.existsSync(indexPath)) {
        return res.status(500).send('Arquivo index.html não encontrado');
    }
    
    // Envia o arquivo index.html como resposta
    res.sendFile(indexPath);
});

// Rota da API para scraping
app.get('/api/scrape', async (req, res) => {
    const keyword = req.query.keyword; // Obtém a palavra-chave da query string
    
    // Validação da palavra-chave
    if (!keyword) {
        return res.status(400).json({ error: 'Parâmetro "keyword" é obrigatório' });
    }

    try {
        // Configuração do headers para simular um navegador e evitar bloqueio
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9', // Idioma preferencial
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' // Tipos de conteúdo aceitos
        };

        // Faz a requisição para a página de busca da Amazon
        const response = await axios.get(`https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`, { headers });
        
        // Parseia o HTML retornado usando JSDOM
        const dom = new JSDOM(response.data);
        const document = dom.window.document;

        // Extrai os produtos da página
        const products = Array.from(document.querySelectorAll('.s-result-item')) // Seleciona todos os itens de resultado
            .map(element => {
                try {
                    // Extrai o título do produto
                    const titleEl = element.querySelector('h2 a');
                    if (!titleEl) return null;

                    const title = titleEl.textContent.trim();
                    
                    // Constrói a URL completa do produto
                    const productUrl = `https://www.amazon.com${titleEl.href.split('?')[0]}`;
                    
                    // Extrai a avaliação (estrelas)
                    const rating = element.querySelector('.a-icon-star-small .a-icon-alt')?.textContent.split(' ')[0] || 'N/A';
                    
                    // Extrai o número de avaliações (remove vírgulas e converte para número)
                    const reviews = parseInt(element.querySelector('.a-size-small .a-link-normal')?.textContent.replace(/,/g, '')) || 0;
                    
                    // Extrai a URL da imagem
                    const imageUrl = element.querySelector('.s-image')?.src || '';

                    // Retorna o objeto do produto apenas se tiver dados válidos
                    return title && productUrl && imageUrl ? {
                        title: title.length > 100 ? `${title.substring(0, 100)}...` : title, // Limita o título a 100 caracteres
                        rating,
                        reviews,
                        imageUrl,
                        productUrl
                    } : null;
                } catch (e) {
                    console.error('Error processing product:', e);
                    return null;
                }
            })
            .filter(Boolean); // Remove valores nulos/undefined do array

        // Retorna os produtos encontrados ou uma mensagem se nenhum for encontrado
        res.json(products.length > 0 ? products : { message: 'Nenhum produto encontrado. Tente outra palavra-chave.' });
    } catch (error) {
        console.error('Erro no scraping:', error.message);
        // Retorna erro 500 com detalhes do problema
        res.status(500).json({ 
            error: 'Erro ao acessar a Amazon',
            details: error.message
        });
    }
});

// Inicia o servidor na porta especificada
app.listen(PORT, () => {
    console.log(`\nServidor rodando em http://localhost:${PORT}`);
    console.log(`Frontend path: ${FRONTEND_DIR}`);
    console.log(`\nAcesse no navegador: http://localhost:${PORT}\n`);
});