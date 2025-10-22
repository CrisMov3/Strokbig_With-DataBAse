(function() {
    document.addEventListener('DOMContentLoaded', function() {
        
        // --- LÓGICA PARA LA SUB-NAVEGACIÓN DE SERVICIOS ---
        const navButtons = document.querySelectorAll('.services-nav-btn');
        const contentGroups = document.querySelectorAll('.content-group');

        if (navButtons.length > 0 && contentGroups.length > 0) {
            navButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const targetId = this.dataset.target;
                    navButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    contentGroups.forEach(group => {
                        if (group.id === targetId) {
                            group.classList.remove('hidden');
                        } else {
                            group.classList.add('hidden');
                        }
                    });
                });
            });
        }
        
        // --- LÓGICA PARA "POR QUÉ USAR ZEITPLAN" ---
        const featureCardsWrapper = document.querySelector('.feature-cards-wrapper');
        const desktopImagePanel = document.querySelector('.why-image-panel');
        if (featureCardsWrapper && desktopImagePanel) {
            const featureCards = featureCardsWrapper.querySelectorAll('.feature-card');
            const desktopDisplayImage = document.getElementById('zeitplan-display-image');
            const desktopImageCaption = document.getElementById('zeitplan-image-caption');
            const mobileMediaQuery = window.matchMedia('(max-width: 1200px)');

            function updateDesktopDisplay(cardElement) {
                if (!cardElement) return;
                const newImageSrc = cardElement.dataset.image;
                const newImageAlt = cardElement.dataset.alt;
                const cardTitle = cardElement.querySelector('.card-text h3').textContent;
                const cardDescription = cardElement.querySelector('.card-text p').textContent;
                desktopDisplayImage.style.opacity = 0;
                setTimeout(() => {
                    desktopDisplayImage.src = newImageSrc;
                    desktopDisplayImage.alt = newImageAlt;
                    desktopImageCaption.textContent = `${cardTitle}: ${cardDescription}`;
                    desktopDisplayImage.style.opacity = 1;
                }, 250);
            }
            
            function handleMobileDisplay(cardElement) {
                const currentlyOpenImage = document.querySelector('.mobile-image-display');
                const wasActive = cardElement.classList.contains('active');
                if (currentlyOpenImage) { currentlyOpenImage.remove(); }
                featureCards.forEach(c => c.classList.remove('active'));
                if (!wasActive) {
                    cardElement.classList.add('active');
                    const newImageSrc = cardElement.dataset.image;
                    const newImageAlt = cardElement.dataset.alt;
                    const imageContainer = document.createElement('div');
                    imageContainer.className = 'mobile-image-display';
                    imageContainer.innerHTML = `<img src="${newImageSrc}" alt="${newImageAlt}">`;
                    cardElement.after(imageContainer);
                }
            }
            
            featureCardsWrapper.addEventListener('click', function(event) {
                const clickedCard = event.target.closest('.feature-card');
                if (!clickedCard) return;
                if (mobileMediaQuery.matches) { handleMobileDisplay(clickedCard); } 
                else {
                    featureCards.forEach(c => c.classList.remove('active'));
                    clickedCard.classList.add('active');
                    updateDesktopDisplay(clickedCard);
                }
            });

            function setInitialStateWhyZeitplan() {
                const openImage = document.querySelector('.mobile-image-display');
                if (openImage) openImage.remove();
                if (mobileMediaQuery.matches) {
                    featureCards.forEach(c => c.classList.remove('active'));
                } else {
                    if (featureCards.length > 0) {
                        if (!document.querySelector('.feature-card.active')) {
                            featureCards[0].classList.add('active');
                        }
                        updateDesktopDisplay(document.querySelector('.feature-card.active') || featureCards[0]);
                    }
                }
            }
            setInitialStateWhyZeitplan();
            mobileMediaQuery.addEventListener('change', setInitialStateWhyZeitplan);
        }

        // --- LÓGICA PARA "SERVICIOS ADICIONALES" ---
        const servicesContainer = document.getElementById('additional-services');
        if (servicesContainer) {
            const serviceCards = servicesContainer.querySelectorAll('.service-card');
            const defaultContent = document.getElementById('default-service-content');
            const dynamicContent = document.getElementById('dynamic-service-content');
            const mobileMediaQuery = window.matchMedia('(max-width: 1200px)');
            const detailsWrapper = document.getElementById('service-details-wrapper');

            const servicesData = {
                mantenimiento: {
                    title: "Mantenimiento de Computadores",
                    description: "Aseguramos el óptimo rendimiento y la longevidad de tus mesas de trabajo con nuestros planes de mantenimiento preventivo y correctivo.",
                    subServices: [
                        { icon: "mdi-speedometer", text: "Optimización de Rendimiento" },
                        { icon: "mdi-virus-outline", text: "Limpieza de Virus y Malware" },
                        { icon: "mdi-memory", text: "Actualización de Componentes" },
                        { icon: "mdi-tools", text: "Diagnóstico y Reparación" }
                    ]
                },
                soporte: {
                    title: "Soporte Técnico ante Incidencias",
                    description: "Nuestro equipo de expertos está listo para resolver cualquier incidencia técnica, minimizando el tiempo de inactividad y garantizando la continuidad de tu operación.",
                    subServices: [
                        { icon: "mdi-remote-desktop", text: "Asistencia Remota Inmediata" },
                        { icon: "mdi-account-hard-hat-outline", text: "Soporte en Sitio Programado" },
                        { icon: "mdi-application-cog-outline", text: "Resolución de Fallas de Software" },
                        { icon: "mdi-account-group-outline", text: "Capacitación a Usuarios" }
                    ]
                },
                desarrolloWeb: {
                    title: "Desarrollo Web",
                    description: "Creamos soluciones web a medida que potencian tu marca, desde páginas corporativas hasta aplicaciones complejas y tiendas en línea.",
                    subServices: [
                        { icon: "mdi-web", text: "Páginas Web Corporativas" },
                        { icon: "mdi-application-braces-outline", text: "Aplicaciones Web a Medida" },
                        { icon: "mdi-cart-outline", text: "E-commerce y Tiendas Online" },
                        { icon: "mdi-update", text: "Mantenimiento de Sitios" }
                    ]
                }
            };

            serviceCards.forEach(card => {
                card.addEventListener('click', function() {
                    const targetKey = this.dataset.target;
                    const wasActive = this.classList.contains('active');
                    serviceCards.forEach(c => c.classList.remove('active'));
                    if (wasActive) {
                        defaultContent.classList.remove('hidden');
                        dynamicContent.classList.add('hidden');
                    } else {
                        this.classList.add('active');
                        const serviceData = servicesData[targetKey];
                        let subServicesHTML = serviceData.subServices.map(sub => `
                            <div class="sub-service-card">
                                <i class="mdi ${sub.icon}"></i>
                                <h4>${sub.text}</h4>
                            </div>
                        `).join('');
                        dynamicContent.innerHTML = `
                            <h3>${serviceData.title}</h3>
                            <p>${serviceData.description}</p>
                            <div class="sub-service-grid">${subServicesHTML}</div>
                        `;
                        defaultContent.classList.add('hidden');
                        dynamicContent.classList.remove('hidden');
                        if (mobileMediaQuery.matches) {
                            setTimeout(() => {
                                detailsWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                        }
                    }
                });
            });
        }
    });
})();