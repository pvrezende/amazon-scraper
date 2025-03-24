document.addEventListener('DOMContentLoaded', () => {
    // Elementos da interface
    const scrapeBtn = document.getElementById('scrape-btn');
    const keywordInput = document.getElementById('keyword');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('spinner');

    // Event listeners
    scrapeBtn.addEventListener('click', scrapeProducts);
    keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') scrapeProducts();
    });

    // Função principal
    async function scrapeProducts() {
        const keyword = keywordInput.value.trim();
        
        if (!keyword) {
            showError('Por favor, digite uma palavra-chave');
            keywordInput.focus();
            return;
        }

        startLoading();
        clearResults();

        try {
            const response = await fetch(`/api/scrape?keyword=${encodeURIComponent(keyword)}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro no servidor');
            }
            
            const data = await response.json();
            
            if (data.message || !Array.isArray(data)) {
                showMessage(data.message || 'Nenhum produto encontrado');
                return;
            }
            
            displayProducts(data);
        } catch (error) {
            showError(error.message);
            console.error('Erro:', error);
        } finally {
            stopLoading();
        }
    }

    // Exibe os produtos na tela
    function displayProducts(products) {
        const productsGrid = document.createElement('div');
        productsGrid.className = 'products-grid';
        
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            productCard.innerHTML = `
                <img src="${product.imageUrl}" alt="${product.title}" class="product-image" 
                     onerror="this.src='https://via.placeholder.com/200?text=Imagem+Não+Disponível'">
                <h3 class="product-title" title="${product.title}">${product.title}</h3>
                <div class="product-rating">
                    ${generateStars(product.rating)}
                    <span>${product.rating !== 'N/A' ? product.rating : 'Sem avaliação'}</span>
                </div>
                <p class="product-reviews">${product.reviews.toLocaleString('pt-BR')} avaliações</p>
                <a href="${product.productUrl}" target="_blank" class="view-product">Ver na Amazon</a>
            `;
            
            productsGrid.appendChild(productCard);
        });
        
        resultsDiv.appendChild(productsGrid);
    }

    // Gera estrelas de avaliação
    function generateStars(rating) {
        if (rating === 'N/A') return '';
        
        const stars = [];
        const numericRating = parseFloat(rating);
        const fullStars = Math.floor(numericRating);
        const hasHalfStar = numericRating % 1 >= 0.5;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars.push('★');
            } else if (i === fullStars + 1 && hasHalfStar) {
                stars.push('½');
            } else {
                stars.push('☆');
            }
        }
        
        return stars.join('');
    }

    // Funções auxiliares
    function startLoading() {
        loadingDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        scrapeBtn.disabled = true;
    }

    function stopLoading() {
        loadingDiv.classList.add('hidden');
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
        scrapeBtn.disabled = false;
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    function showMessage(message) {
        resultsDiv.innerHTML = `<p class="info-message">${message}</p>`;
    }

    function clearResults() {
        resultsDiv.innerHTML = '';
    }
});