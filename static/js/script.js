document.addEventListener('DOMContentLoaded', function(){
    const getData = document.getElementById('getData');
    const sendReset = document.getElementById('sendReset');

    const dataValue = [];
    const totalRecords = document.getElementById('totalRecords');
    const lastReset = document.getElementById('lastReset');
    const lastPing = document.getElementById('lastPing');
    const errorMessage = document.getElementById('errorMessage');
    const pingDelta = document.getElementById('pingDelta');
    const resetDelta = document.getElementById('resetDelta');

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


            dataValue.innerHTML = '<pre>' + JSON.stringify(data.data, null, 2) + '</pre>';
            totalRecords.textContent = data.total_records;
            lastReset.textContent = data.text_last_reset;
            lastPing.textContent = data.text_last_ping;
            pingDelta.textContent = data.ping_delta + ' seconds';
            resetDelta.textContent = data.reset_delta + ' seconds';
        
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

    // Reset button handler
    sendReset.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/put_reset', { method: 'PUT' });
            const data = await response.json();
            alert('Resetting in at most 20 seconds.')
        } catch (error) {
            console.error('Error occurred:', error);
            errorMessage.textContent = 'An error occurred while resetting.';
        }
    });
    setInterval(fetchData, 5000);
})