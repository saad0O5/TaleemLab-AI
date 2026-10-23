export type Language = 'en' | 'ur'

export const translations = {
  en: {
    // App Header & Navigation
    appTitle: 'TaleemLab AI',
    appSubtitle: 'Matric Practical Science Suite (Grades 9-10)',
    step1: 'Capture / Select',
    step2: 'Confirm',
    step3: 'Simulate',
    step4: 'Progress',
    step5: 'Evaluation',
    allLabs: '← All Labs',
    switchSubject: 'Switch Subject',
    langToggle: 'اردو',

    // Subjects
    physics: 'Physics',
    physicsSubtitle: 'DC Circuits & Ohm\'s Law (Grade 9-10 Ch. 14)',
    chemistry: 'Chemistry',
    chemistrySubtitle: 'Acid-Base Titration & pH (Grade 10 Ch. 10)',
    biology: 'Biology',
    biologySubtitle: 'Genetics & Punnett Square (Grade 10 Ch. 15)',
    computer: 'Computer Science',
    computerSubtitle: 'Digital Logic Gates & ALU (Grade 9-10 CS)',

    // Common Lab Controls
    simulateMode: 'Simulate',
    sandboxMode: '+ Sandbox Mode',
    reset: 'Reset',
    undo: 'Undo',
    voltage: 'Voltage',
    resistance: 'Resistance',
    current: 'Current',
    brightness: 'Bulb Brightness',
    switchOpen: 'Switch Open',
    switchClosed: 'Switch Closed',
    predictFirst: 'PREDICT FIRST',
    increases: '▲ Increases',
    decreases: '▼ Decreases',
    staysSame: '= Stays Same',
    hint: 'Need a hint?',
    cancel: 'Cancel',

    // Computer Lab
    logicGates: 'Logic Gates & Truth Table',
    halfAdder: 'Half Adder Arithmetic (ALU)',
    binaryBoard: '8-Bit Binary Switchboard',
    inputA: 'Input A',
    inputB: 'Input B',
    outputY: 'Output Y',
    activeGate: 'Active Gate',
    tested: 'Tested',

    // Chemistry Lab
    buretteDispenser: 'Burette Dispenser Controls',
    addDrop: '+1 mL Drop',
    addPour: '+5 mL Pour',
    resetFlask: 'Reset Flask',
    acidInFlask: '0.1M HCl in Flask',
    baseAdded: '0.1M NaOH Added',
    digitalPH: 'Digital pH Meter',
    equivalencePoint: 'Equivalence Point (25 mL)',

    // Biology Lab
    parentMother: 'Mother (Parent 1 Alleles)',
    parentFather: 'Father (Parent 2 Alleles)',
    breedingTrial: '🎲 Breed 20 Offspring',
    brownEyes: 'Brown Eyes (Dominant)',
    blueEyes: 'Blue Eyes (Recessive)',
    phenotypicRatio: 'Phenotypic Ratio',
    genotypicRatio: 'Genotypic Ratio',
    close: 'Close',
  },
  ur: {
    // App Header & Navigation
    appTitle: 'تعلِیم لیب AI',
    appSubtitle: 'میٹرک سائنس پریکٹیکل لیب (نویں اور دسویں جماعت)',
    step1: 'منتخب / تصویر',
    step2: 'تصدیق',
    step3: 'تجربہ گاہ (Simulate)',
    step4: 'کارکردگی',
    step5: 'امتحان',
    allLabs: '← تمام مضامین',
    switchSubject: 'مضمون تبدیل کریں',
    langToggle: 'English',

    // Subjects
    physics: 'طبیعیات (Physics)',
    physicsSubtitle: 'ڈی سی سرکٹس اور اوہم کا قانون (باب 14)',
    chemistry: 'کیمسٹری (Chemistry)',
    chemistrySubtitle: 'عملِ تعدیل (Titration) اور پی ایچ (باب 10)',
    biology: 'حیاتیات (Biology)',
    biologySubtitle: 'جینیات اور پنیٹ اسکوائر (باب 15)',
    computer: 'کمپیوٹر سائنس (Computer)',
    computerSubtitle: 'منطقی گیٹس، ہاف ایڈر اور بائنری (نویں/دسویں)',

    // Common Lab Controls
    simulateMode: 'تجربہ (Simulate)',
    sandboxMode: '+ سینڈ باکس موڈ',
    reset: 'دوبارہ شروع کریں',
    undo: 'واپس',
    voltage: 'وولٹیج (Voltage)',
    resistance: 'مزاحمت (Resistance)',
    current: 'کرنٹ (Current)',
    brightness: 'بلب کی روشنی',
    switchOpen: 'سوئچ کھلا ہے (Open)',
    switchClosed: 'سوئچ بند ہے (Closed)',
    predictFirst: 'پہلے اندازہ لگائیں (Predict First)',
    increases: '▲ بڑھے گا (Increases)',
    decreases: '▼ کم ہوگا (Decreases)',
    staysSame: '= کوئی تبدیلی نہیں',
    hint: 'مدد چاہیے؟',
    cancel: 'منسوخ',

    // Computer Lab
    logicGates: 'منطقی گیٹس اور ٹروتھ ٹیبل',
    halfAdder: 'ہاف ایڈر جمع کا سرکٹ (ALU)',
    binaryBoard: '8-بٹ بائنری سوئچ بورڈ',
    inputA: 'ان پٹ A',
    inputB: 'ان پٹ B',
    outputY: 'آؤٹ پٹ Y',
    activeGate: 'منتخب گیٹ',
    tested: 'چیک شدہ',

    // Chemistry Lab
    buretteDispenser: 'بیوریٹ ڈسپنسر کے بٹن',
    addDrop: '+1 ملی لیٹر قطرہ',
    addPour: '+5 ملی لیٹر اضافہ',
    resetFlask: 'فلاسک صاف کریں',
    acidInFlask: '0.1M ہائیڈروکلورک ایسڈ',
    baseAdded: '0.1M سوڈیم ہائیڈرو آکسائیڈ شامل',
    digitalPH: 'ڈیجیٹل پی ایچ میٹر',
    equivalencePoint: 'نقطہ برابری (25 ملی لیٹر)',

    // Biology Lab
    parentMother: 'والدہ کے الیلز (Parent 1)',
    parentFather: 'والد کے الیلز (Parent 2)',
    breedingTrial: '🎲 20 بچوں کی ورچوئل بریڈنگ',
    brownEyes: 'بھوری آنکھیں (غالب صفت)',
    blueEyes: 'نیلی آنکھیں (مغلوب صفت)',
    phenotypicRatio: 'ظاہری تناسب (Phenotype)',
    genotypicRatio: 'جینیاتی تناسب (Genotype)',
    close: 'بند کریں',
  }
} as const
