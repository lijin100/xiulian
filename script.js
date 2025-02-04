let tasks = [];
const rewards = [
    '喝一杯茶',
    '抽烟',
    '喝一口咖啡',
    '伸展',
    '深呼吸5m',
    '看窗外',
  
];

// 添加时间相关的常量
const CLEAR_HOUR = 8; // 清空时间：早上8点
const STORAGE_KEY = 'zenTasks'; // localStorage的键名

// 添加到文件开头
let audioContext;

// 从localStorage加载任务
function loadTasks() {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks) {
        tasks = JSON.parse(savedTasks).map(task => ({
            ...task,
            startTime: new Date(task.startTime),
            completedAt: task.completedAt ? new Date(task.completedAt) : null
        }));
    }
}

// 保存任务到localStorage
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// 检查是否需要清空任务
function checkAndClearTasks() {
    const now = new Date();
    const lastClearDate = localStorage.getItem('lastClearDate');
    
    // 如果是新的一天且当前时间超过早上8点
    if ((!lastClearDate || new Date(lastClearDate).getDate() !== now.getDate()) 
        && now.getHours() >= CLEAR_HOUR) {
        tasks = [];
        saveTasks();
        localStorage.setItem('lastClearDate', now.toISOString());
        initAchievementTree();
        renderTasks();
        updateTotalTime();
    }
}

function addTask() {
    const taskInput = document.getElementById('taskInput');
    const timeInput = document.getElementById('timeInput');
    
    if (!taskInput.value || !timeInput.value) {
        alert('请输入任务内容和预计时间！');
        return;
    }

    const task = {
        id: Date.now(),
        content: taskInput.value,
        estimatedTime: parseInt(timeInput.value), // 预计时间
        startTime: new Date(), // 记录开始时间
        completed: false,
        completedAt: null,
        actualTime: 0 // 实际用时（分钟）
    };

    tasks.push(task);
    saveTasks(); // 保存更改
    renderTasks();
    updateTotalTime();

    taskInput.value = '';
    timeInput.value = '';
}

function completeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = true;
        task.completedAt = new Date();
        
        // 计算实际用时（分钟）
        const timeDiff = task.completedAt - task.startTime;
        task.actualTime = Math.round(timeDiff / (1000 * 60));
        
        saveTasks(); // 保存更改
        renderTasks();
        updateTotalTime();
        addToAchievementTree(task);
        
        // 启用转盘按钮
        document.getElementById('spinButton').disabled = false;
    }
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';

    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        // 计算当前进行时间（如果任务未完成）
        let currentDuration = '';
        if (!task.completed) {
            const timeDiff = new Date() - task.startTime;
            const minutes = Math.round(timeDiff / (1000 * 60));
            currentDuration = `<p>已进行：${minutes} 分钟</p>`;
        }
        
        taskElement.innerHTML = `
            <div class="task-content">
                <h3>${task.content}</h3>
                <p>预计时间：${task.estimatedTime} 分钟</p>
                ${currentDuration}
                ${task.completed ? `
                    <p>完成时间：${task.completedAt.toLocaleTimeString()}</p>
                    <p>实际用时：${task.actualTime} 分钟</p>
                ` : ''}
            </div>
            ${!task.completed ? `
                <button onclick="completeTask(${task.id})">完成</button>
            ` : ''}
        `;

        taskList.appendChild(taskElement);
    });
}

function updateTotalTime() {
    const totalTime = tasks.reduce((sum, task) => {
        return sum + (task.completed ? task.actualTime : 0);
    }, 0);
    document.getElementById('totalTime').textContent = totalTime;
}

// 添加定时更新功能
setInterval(() => {
    if (tasks.some(task => !task.completed)) {
        renderTasks(); // 更新正在进行的任务时间
    }
}, 60000); // 每分钟更新一次

function spinReward() {
    // 初始化音频上下文
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 创建音效
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 100);

    const wheel = document.getElementById('wheel');
    const wheelInner = document.createElement('div');
    const pointer = document.getElementById('wheelPointer');
    wheelInner.className = 'wheel-inner';
    wheel.querySelector('.wheel-inner')?.remove();
    
    // 重置指针的过渡效果
    pointer.style.transition = 'none';
    pointer.style.transform = 'rotate(0deg)';
    pointer.offsetHeight;
    
    // 计算每个奖励的位置
    const angleStep = 360 / rewards.length;
    const radius = 95; // 增大半径以适应更大的圆圈
    
    rewards.forEach((reward, index) => {
        const rewardElement = document.createElement('div');
        rewardElement.className = 'reward-option';
        rewardElement.textContent = reward;
        
        // 计算位置，调整角度使文字水平
        const angle = angleStep * index;
        const radian = (angle * Math.PI) / 180;
        const x = Math.cos(radian) * radius;
        const y = Math.sin(radian) * radius;
        
        // 设置位置和旋转，调整偏移量以确保居中
        rewardElement.style.left = `calc(50% + ${x}px - 32.5px)`;
        rewardElement.style.top = `calc(50% + ${y}px - 32.5px)`;
        rewardElement.style.transform = `rotate(0deg)`;
        
        wheelInner.appendChild(rewardElement);
    });
    
    // 将 wheelInner 插入到指针之前
    wheel.insertBefore(wheelInner, pointer);

    // 禁用按钮，避免重复点击
    document.getElementById('spinButton').disabled = true;

    // 随机选择奖励并旋转
    const randomIndex = Math.floor(Math.random() * rewards.length);
    const spinDuration = 8;
    const fastSpins = 10;
    const slowSpins = 5;
    
    // 计算目标角度
    const targetAngle = (fastSpins + slowSpins) * 360 + (360 - (randomIndex * angleStep));
    
    // 重新设置动画效果
    requestAnimationFrame(() => {
        pointer.style.transition = `transform ${spinDuration}s cubic-bezier(0.5, 0.02, 0.2, 1.0)`;
        pointer.style.transform = `rotate(${targetAngle}deg)`;
        
        // 旋转结束后高亮选中项
        setTimeout(() => {
            const rewardElements = document.querySelectorAll('.reward-option');
            rewardElements[randomIndex].classList.add('selected');
            
            // 显示奖励提示
            const reward = rewards[randomIndex];
            alert(`恭喜获得奖励：${reward}！\n现在请享受你的${reward}时光吧～`);
            
            // 重置按钮状态
            document.getElementById('spinButton').disabled = false;
        }, spinDuration * 1000);
    });
}

// 获取元素当前的旋转角度
function getCurrentRotation(element) {
    const style = window.getComputedStyle(element);
    const matrix = new WebKitCSSMatrix(style.transform);
    const angle = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
    return angle < 0 ? angle + 360 : angle;
}

function addToAchievementTree(task) {
    const treeBranches = document.getElementById('treeBranches');
    const treeItem = document.createElement('div');
    treeItem.className = 'tree-item';
    
    // 格式化完成时间
    const timeStr = task.completedAt.toLocaleTimeString('zh', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    treeItem.innerHTML = `
        <div class="task-name">${task.content}</div>
        <div class="task-time">${timeStr}</div>
        <div class="task-duration">${task.actualTime}分钟</div>
    `;
    
    // 随机设置初始位置和动画
    const randomDelay = Math.random() * 2;
    const randomDuration = 3 + Math.random() * 2;
    treeItem.style.animationDelay = `-${randomDelay}s`;
    treeItem.style.animationDuration = `${randomDuration}s`;
    
    treeBranches.appendChild(treeItem);
}

// 初始化成果树时的布局处理
function initAchievementTree() {
    const treeBranches = document.getElementById('treeBranches');
    treeBranches.innerHTML = '';
    
    const completedTasks = tasks.filter(task => task.completed);
    
    // 重新添加所有完成的任务
    completedTasks.forEach((task, index) => {
        const treeItem = document.createElement('div');
        treeItem.className = 'tree-item';
        
        const timeStr = task.completedAt.toLocaleTimeString('zh', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        treeItem.innerHTML = `
            <div class="task-name">${task.content}</div>
            <div class="task-time">${timeStr}</div>
            <div class="task-duration">${task.actualTime}分钟</div>
        `;
        
        // 随机设置初始位置
        const randomDelay = Math.random() * 2;
        treeItem.style.animationDelay = `-${randomDelay}s`;
        
        treeBranches.appendChild(treeItem);
    });
}

// 修改初始化函数
function init() {
    loadTasks(); // 加载保存的任务
    checkAndClearTasks(); // 检查是否需要清空
    renderTasks();
    updateTotalTime();
    initAchievementTree();
    
    // 初始化转盘
    spinReward();
    
    // 添加转盘按钮点击事件
    const spinButton = document.getElementById('spinButton');
    spinButton.addEventListener('click', spinReward);
    
    // 初始时禁用转盘按钮
    spinButton.disabled = true;

    // 添加定时检查
    setInterval(checkAndClearTasks, 60000); // 每分钟检查一次
}

// 初始化页面
init();

// 页面关闭前保存数据
window.addEventListener('beforeunload', () => {
    saveTasks();
}); 
