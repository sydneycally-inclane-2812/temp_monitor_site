document.addEventListener('DOMContentLoaded', function(){
    const getData = document.getElementById('getData');
    const sendReset = document.getElementById('sendReset');

    const dataValue = [];
    const totalRecords = document.getElementById('totalRecords');
    const lastPwrTrigger = document.getElementById('lastPwrTrigger');
    const lastPing = document.getElementById('lastPing');
    const errorMessage = document.getElementById('errorMessage');
    const pingDelta = document.getElementById('pingDelta');
    const resetDelta = document.getElementById('resetDelta');
    const pcStatus = document.getElementById('pcStatus');
    const lastMotion = document.getElementById('lastMotion');

    // D3.js Chart Setup
    const svg = d3.select("#chart");
    const margin = {top: 20, right: 80, bottom: 30, left: 50};
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    function createChart(data) {
        // Clear previous chart
        svg.selectAll("*").remove();

        if (!data || data.length === 0) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("No data available");
            return;
        }

        // Parse data
        const processedData = data.map(d => ({
            date: new Date(d.timestamp * 1000),
            temperature: +d.temperature,
            humidity: +d.humidity
        }));

        // X scale (time)
        const x = d3.scaleTime()
            .domain(d3.extent(processedData, d => d.date))
            .range([0, width]);

        // Y scale for temperature
        const yTemp = d3.scaleLinear()
            .domain([d3.min(processedData, d => d.temperature) - 1, d3.max(processedData, d => d.temperature) + 1])
            .range([height, 0]);

        // Y scale for humidity
        const yHum = d3.scaleLinear()
            .domain([d3.min(processedData, d => d.humidity) - 5, d3.max(processedData, d => d.humidity) + 5])
            .range([height, 0]);

        // Line generators
        const tempLine = d3.line()
            .x(d => x(d.date))
            .y(d => yTemp(d.temperature));

        const humLine = d3.line()
            .x(d => x(d.date))
            .y(d => yHum(d.humidity));

        // Chart group
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // X axis
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%H:%M:%S")));

        // Y axis for temperature (left)
        g.append("g")
            .call(d3.axisLeft(yTemp).ticks(5))
            .append("text")
            .attr("fill", "#ff6b6b")
            .attr("x", 6)
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "start")
            .text("Temperature (°C)");

        // Y axis for humidity (right)
        g.append("g")
            .attr("transform", `translate(${width},0)`)
            .call(d3.axisRight(yHum).ticks(5))
            .append("text")
            .attr("fill", "#4ecdc4")
            .attr("x", -6)
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Humidity (%)");

        // Draw temperature line
        g.append("path")
            .datum(processedData)
            .attr("fill", "none")
            .attr("stroke", "#ff6b6b")
            .attr("stroke-width", 2)
            .attr("d", tempLine);

        // Draw humidity line
        g.append("path")
            .datum(processedData)
            .attr("fill", "none")
            .attr("stroke", "#4ecdc4")
            .attr("stroke-width", 2)
            .attr("d", humLine);

        // Legend
        const legend = g.append("g")
            .attr("transform", `translate(${width - 120}, 10)`);
        legend.append("rect").attr("x", -40).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", "#ff6b6b");
        legend.append("text").attr("x", -26).attr("y", 10).text("Temperature").attr("font-size", 12);
        legend.append("rect").attr("x", -40).attr("y", 18).attr("width", 12).attr("height", 12).attr("fill", "#4ecdc4");
        legend.append("text").attr("x", -26).attr("y", 28).text("Humidity").attr("font-size", 12);
    }

    // Function to handle get data
    async function fetchData() {
        try {
            const response = await fetch('/api/get_data');
            const data = await response.json();

            totalRecords.textContent = data.total_records;
            lastPwrTrigger.textContent = data.text_last_pwr_trigger;
            lastPing.textContent = data.text_last_ping;
            pingDelta.textContent = data.ping_delta + ' seconds';
            resetDelta.textContent = data.reset_delta + ' seconds';
            pcStatus.textContent = data.pc_status ? 'Online' : 'Offline';
            
            // Format motion detection time
            if (data.last_motion_detected && data.last_motion_detected !== 0) {
                lastMotion.textContent = new Date(data.last_motion_detected * 1000).toLocaleString();
            } else {
                lastMotion.textContent = 'Never';
            }
        
            // Create chart with the received data
            createChart(data.data);
        } catch (error) {
            console.error('Error occurred:', error);
        }
    }

    // Initial data fetch
    fetchData().catch(error => {
        console.error('Error fetching initial data:', error);
        errorMessage.textContent = 'An error occurred while fetching initial data.';
    });

    // Get data button handler
    getData.addEventListener('click', async function() {
        errorMessage.textContent = ''; // Clear previous error message
        try {
            await fetchData();
        } catch (error) {
            console.error('Error occurred:', error);
            errorMessage.textContent = 'An error occurred while fetching data.';
        }
    });

// ...existing code...

    // Function to create custom password input modal
    function createPasswordModal() {
        return new Promise((resolve, reject) => {
            // Create modal elements
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: var(--background-color, #1a1a1a);
                border: 2px solid var(--primary-color, #4ecdc4);
                padding: 20px;
                border-radius: 8px;
                min-width: 300px;
                text-align: center;
            `;
            
            modalContent.innerHTML = `
                <h3>Enter Credentials</h3>
                <input type="password" id="credentialsInput" placeholder="Enter password" style="
                    width: 100%;
                    padding: 10px;
                    margin: 10px 0;
                    border: 1px solid var(--primary-color, #4ecdc4);
                    background: var(--background-color, #1a1a1a);
                    color: var(--font-color, #ffffff);
                    border-radius: 4px;
                ">
                <div style="margin-top: 15px;">
                    <button id="submitCredentials" class="btn btn-primary" style="margin-right: 10px;">Submit</button>
                    <button id="cancelCredentials" class="btn btn-default">Cancel</button>
                </div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Focus on input
            const input = modalContent.querySelector('#credentialsInput');
            input.focus();
            
            // Handle submit
            const submitBtn = modalContent.querySelector('#submitCredentials');
            const cancelBtn = modalContent.querySelector('#cancelCredentials');
            
            function cleanup() {
                document.body.removeChild(modal);
            }
            
            submitBtn.addEventListener('click', () => {
                const credentials = input.value.trim();
                if (credentials === '') {
                    alert('Credentials cannot be empty!');
                    return;
                }
                cleanup();
                resolve(credentials);
            });
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });
            
            // Handle Enter key
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    submitBtn.click();
                }
            });
            
            // Handle Escape key
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cancelBtn.click();
                }
            });
        });
    }

    // Power trigger button handler with custom modal
    sendReset.addEventListener('click', async function() {
        try {
            const userCredentials = await createPasswordModal();
            
            // Check if user cancelled
            if (userCredentials === null) {
                return; // User cancelled
            }
            
            const response = await fetch('/api/put_reset', { 
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'credentials': userCredentials
                })
            });
            const data = await response.json();
            
            if (response.ok) {
                alert('Power trigger activated! ESP will respond within 15 seconds.');
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error('Error occurred:', error);
            errorMessage.textContent = 'An error occurred while triggering power.';
        }
    });

    setInterval(fetchData, 5000);
})