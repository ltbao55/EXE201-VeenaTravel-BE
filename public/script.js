// Global variables
let selectedProduct = null;
let selectedPrice = 0;
let selectedName = '';
let payOSCheckout = null;
let currentPaymentData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkServerStatus();
    checkPayOSStatus();
});

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        document.getElementById('serverStatus').textContent = 'Connected';
        document.getElementById('serverStatus').style.color = '#4caf50';
    } catch (error) {
        document.getElementById('serverStatus').textContent = 'Disconnected';
        document.getElementById('serverStatus').style.color = '#e74c3c';
    }
}

// Check PayOS status
async function checkPayOSStatus() {
    try {
        const response = await fetch('/api/payments/status');
        const data = await response.json();
        if (data.success) {
            document.getElementById('payosStatus').textContent = 'Ready';
            document.getElementById('payosStatus').style.color = '#4caf50';
        } else {
            document.getElementById('payosStatus').textContent = 'Not Configured';
            document.getElementById('payosStatus').style.color = '#e74c3c';
        }
    } catch (error) {
        document.getElementById('payosStatus').textContent = 'Error';
        document.getElementById('payosStatus').style.color = '#e74c3c';
    }
}

// Select product
function selectProduct(productType, price, name) {
    selectedProduct = productType;
    selectedPrice = price;
    selectedName = name;
    
    // Hide product selection
    document.querySelector('.product-section').style.display = 'none';
    
    // Show selected product info
    const selectedProductDiv = document.getElementById('selectedProduct');
    selectedProductDiv.innerHTML = `
        <h3><i class="fas fa-check-circle"></i> Đã chọn: ${name}</h3>
        <p class="price">Giá: ${price.toLocaleString('vi-VN')} VNĐ</p>
    `;
    
    // Show payment form
    document.getElementById('paymentSection').style.display = 'block';
    
    // Scroll to payment form
    document.getElementById('paymentSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Go back to product selection
function goBack() {
    document.querySelector('.product-section').style.display = 'block';
    document.getElementById('paymentSection').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
    
    // Reset form
    document.getElementById('paymentForm').reset();
    selectedProduct = null;
    selectedPrice = 0;
    selectedName = '';
}

// Handle payment form submission
document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Show loading
    document.getElementById('paymentSection').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'block';
    
    // Get form data
    const formData = new FormData(this);
    const paymentData = {
        amount: selectedPrice,
        description: formData.get('description') || `Thanh toán ${selectedName}`,
        items: [{
            name: selectedName,
            quantity: 1,
            price: selectedPrice
        }],
        customer: {
            name: formData.get('customerName'),
            email: formData.get('customerEmail'),
            phone: formData.get('customerPhone')
        }
    };
    
    try {
        // Create payment link
        const response = await fetch('/api/payments/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token' // Mock token for testing
            },
            body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store payment data
            currentPaymentData = result.data;
            
            // Initialize PayOS embedded checkout
            initializePayOSCheckout(result.data.checkoutUrl);
        } else {
            showError(result.message || 'Có lỗi xảy ra khi tạo link thanh toán');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showError('Không thể kết nối đến server. Vui lòng thử lại.');
    }
});

// Show error message
function showError(message) {
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// Reset form
function resetForm() {
    document.getElementById('errorSection').style.display = 'none';
    document.getElementById('paymentSection').style.display = 'block';
    document.getElementById('paymentForm').reset();
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#e74c3c' : '#2196f3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Initialize PayOS embedded checkout
function initializePayOSCheckout(checkoutUrl) {
    try {
        // Hide loading section
        document.getElementById('loadingSection').style.display = 'none';
        
        // Show PayOS checkout section
        document.getElementById('payosCheckoutSection').style.display = 'block';
        
        // Scroll to checkout section
        document.getElementById('payosCheckoutSection').scrollIntoView({ 
            behavior: 'smooth' 
        });
        
        // Configure PayOS
        const payOSConfig = {
            RETURN_URL: window.location.origin + '/success.html',
            ELEMENT_ID: 'payos-checkout-container',
            CHECKOUT_URL: checkoutUrl,
            embedded: true,
            onSuccess: (event) => {
                console.log('PayOS Success:', event);
                showNotification('Thanh toán thành công!', 'success');
                
                // Redirect to success page with order info
                setTimeout(() => {
                    window.location.href = `/success.html?orderCode=${event.orderCode}&amount=${currentPaymentData.amount}&status=success`;
                }, 2000);
            },
            onCancel: (event) => {
                console.log('PayOS Cancel:', event);
                showNotification('Thanh toán đã bị hủy', 'error');
                
                // Redirect to cancel page
                setTimeout(() => {
                    window.location.href = `/cancel.html?orderCode=${event.orderCode}&amount=${currentPaymentData.amount}&status=cancel`;
                }, 2000);
            },
            onExit: (event) => {
                console.log('PayOS Exit:', event);
                showNotification('Đã thoát khỏi thanh toán', 'info');
                
                // Close checkout and return to form
                setTimeout(() => {
                    closePayOSCheckout();
                }, 1000);
            }
        };
        
        // Initialize PayOS checkout
        if (typeof PayOSCheckout !== 'undefined') {
            const { open, exit } = PayOSCheckout.usePayOS(payOSConfig);
            payOSCheckout = { open, exit };
            
            // Open the checkout
            open();
        } else {
            console.error('PayOS Checkout script not loaded');
            showError('PayOS Checkout script không được tải. Vui lòng thử lại.');
        }
        
    } catch (error) {
        console.error('Initialize PayOS checkout error:', error);
        showError('Không thể khởi tạo PayOS checkout. Vui lòng thử lại.');
    }
}

// Close PayOS checkout
function closePayOSCheckout() {
    try {
        if (payOSCheckout && payOSCheckout.exit) {
            payOSCheckout.exit();
        }
        
        // Hide checkout section
        document.getElementById('payosCheckoutSection').style.display = 'none';
        
        // Show payment form again
        document.getElementById('paymentSection').style.display = 'block';
        
        // Clear checkout container
        document.getElementById('payos-checkout-container').innerHTML = '';
        
        // Reset variables
        payOSCheckout = null;
        currentPaymentData = null;
        
    } catch (error) {
        console.error('Close PayOS checkout error:', error);
    }
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
