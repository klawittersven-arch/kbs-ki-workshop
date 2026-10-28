/*
 * Demo 6 („Lernen mit … unterschiedlichen Sprachen“): Text und Fragen zur Händehygiene
 * in sechs Sprachen und drei Niveaustufen (0 = Leichte Sprache, 1 = Standard, 2 = Fachsprache).
 * Die Übersetzungen sind maschinell erstellt – für den echten Unterricht von Muttersprachlern prüfen lassen.
 * Reihenfolge der Antworten ist in allen Fassungen gleich; die richtigen stehen in SPRACHEN_LOESUNG (gemeinsam.js).
 */

export const SPRACHEN = [
  { code: 'de', name: 'Deutsch', eigen: 'Deutsch', stimme: 'de-DE' },
  { code: 'tr', name: 'Türkisch', eigen: 'Türkçe', stimme: 'tr-TR' },
  { code: 'ru', name: 'Russisch', eigen: 'Русский', stimme: 'ru-RU' },
  { code: 'uk', name: 'Ukrainisch', eigen: 'Українська', stimme: 'uk-UA' },
  { code: 'fr', name: 'Französisch', eigen: 'Français', stimme: 'fr-FR' },
  { code: 'es', name: 'Spanisch', eigen: 'Español', stimme: 'es-ES' },
];

export const NIVEAU_NAMEN_DE = ['Leichte Sprache', 'Standard', 'Fachsprache'];

// Kleine Flaggen als SVG (Flaggen-Emojis zeigt Windows nicht an)
export const FLAGGEN = {
  de: '<svg viewBox="0 0 30 18"><rect width="30" height="6" fill="#000"/><rect y="6" width="30" height="6" fill="#DD0000"/><rect y="12" width="30" height="6" fill="#FFCE00"/></svg>',
  tr: '<svg viewBox="0 0 30 18"><rect width="30" height="18" fill="#E30A17"/><circle cx="11" cy="9" r="5" fill="#fff"/><circle cx="12.3" cy="9" r="4" fill="#E30A17"/><path d="M 16.2 9 L 19.6 7.9 L 17.5 10.8 L 17.5 7.2 L 19.6 10.1 Z" fill="#fff"/></svg>',
  ru: '<svg viewBox="0 0 30 18"><rect width="30" height="6" fill="#fff"/><rect y="6" width="30" height="6" fill="#0039A6"/><rect y="12" width="30" height="6" fill="#D52B1E"/></svg>',
  uk: '<svg viewBox="0 0 30 18"><rect width="30" height="9" fill="#0057B7"/><rect y="9" width="30" height="9" fill="#FFD700"/></svg>',
  fr: '<svg viewBox="0 0 30 18"><rect width="10" height="18" fill="#002395"/><rect x="10" width="10" height="18" fill="#fff"/><rect x="20" width="10" height="18" fill="#ED2939"/></svg>',
  es: '<svg viewBox="0 0 30 18"><rect width="30" height="18" fill="#AA151B"/><rect y="4.5" width="30" height="9" fill="#F1BF00"/></svg>',
};

export const INHALT = {
  de: {
    titel: 'Händehygiene',
    niveaus: ['Leichte Sprache', 'Standard', 'Fachsprache'],
    ui: {
      sprache: 'Sprache', niveau: 'Niveau', vorlesen: '🔊 Vorlesen', stopp: '⏹ Stopp', fragen: 'Fragen',
      richtig: 'Richtig!', falsch: 'Leider falsch – versuch es noch einmal.',
      fertig: 'Geschafft! Du hast alle Fragen richtig beantwortet.',
      keineStimme: 'Dein Handy hat für diese Sprache keine Vorlese-Stimme.',
      hinweis: '10 Punkte für jede Frage, die beim ersten Versuch stimmt.',
    },
    texte: [
      'Auf den Händen sind Keime. Keime kann man nicht sehen. Keime können krank machen. Darum desinfiziert man die Hände. Das heißt: Man macht die Keime kaputt.\nWann? Vor und nach der Arbeit mit einem Menschen.\nSo geht es:\n1. Ringe und Uhr abnehmen.\n2. Eine Hand voll Desinfektions-Mittel nehmen.\n3. Das Mittel gut verreiben. Überall. Auch die Finger-Spitzen und den Daumen.\n4. Mindestens 30 Sekunden lang reiben.',
      'Über die Hände werden die meisten Krankheitserreger übertragen. Deshalb desinfiziert man in der Pflege die Hände – zum Beispiel vor und nach jedem Kontakt mit einer Patientin oder einem Patienten. Vorher legt man Ringe und Uhr ab, denn darunter können sich Keime halten. Man nimmt eine Hohlhand voll Desinfektionsmittel (etwa 3 bis 5 ml) und reibt es in die trockenen Hände ein. Die Hände müssen mindestens 30 Sekunden lang feucht bleiben. Besonders oft vergessen werden die Fingerspitzen und die Daumen.',
      'Die hygienische Händedesinfektion ist die wichtigste Einzelmaßnahme zur Prävention nosokomialer Infektionen. Indiziert ist sie u. a. vor und nach Patientenkontakt, vor aseptischen Tätigkeiten sowie nach Kontakt mit potenziell infektiösem Material. Schmuck, Uhren und künstliche Fingernägel sind unzulässig, da sie die Erregerreduktion beeinträchtigen. Es werden 3–5 ml eines alkoholischen Präparats auf die trockenen Hände gegeben und über die gesamte Einwirkzeit von mindestens 30 Sekunden eingerieben. Benetzungslücken treten am häufigsten an Fingerkuppen und Daumen auf.',
    ],
    fragen: [
      [
        { frage: 'Wie lange reibt man das Mittel ein?', optionen: ['10 Sekunden', 'Mindestens 30 Sekunden', '5 Minuten'] },
        { frage: 'Was vergisst man oft?', optionen: ['Den Unterarm', 'Den Handrücken', 'Finger-Spitzen und Daumen'] },
        { frage: 'Was macht man vorher mit Ringen und Uhr?', optionen: ['Abnehmen', 'Anbehalten', 'Mit Mittel besprühen'] },
      ],
      [
        { frage: 'Wie lange müssen die Hände mindestens feucht bleiben?', optionen: ['10 Sekunden', '30 Sekunden', '5 Minuten'] },
        { frage: 'Welche Stellen werden besonders oft vergessen?', optionen: ['Die Unterarme', 'Die Handrücken', 'Fingerspitzen und Daumen'] },
        { frage: 'Warum legt man vorher Ringe und Uhr ab?', optionen: ['Weil sich darunter Keime halten können', 'Weil sie beim Arbeiten stören', 'Weil das Mittel sie beschädigt'] },
      ],
      [
        { frage: 'Wie lang ist die Mindest-Einwirkzeit?', optionen: ['10 Sekunden', '30 Sekunden', '5 Minuten'] },
        { frage: 'Wo treten Benetzungslücken am häufigsten auf?', optionen: ['An den Unterarmen', 'Am Handrücken', 'An Fingerkuppen und Daumen'] },
        { frage: 'Warum ist Schmuck unzulässig?', optionen: ['Er beeinträchtigt die Erregerreduktion', 'Er stört bei der Dokumentation', 'Er wird vom Präparat beschädigt'] },
      ],
    ],
  },

  tr: {
    titel: 'El hijyeni',
    niveaus: ['Kolay dil', 'Standart', 'Uzman dili'],
    ui: {
      sprache: 'Dil', niveau: 'Seviye', vorlesen: '🔊 Sesli oku', stopp: '⏹ Durdur', fragen: 'Sorular',
      richtig: 'Doğru!', falsch: 'Maalesef yanlış – tekrar dene.',
      fertig: 'Tebrikler! Tüm soruları doğru cevapladın.',
      keineStimme: 'Telefonunda bu dil için okuma sesi yok.',
      hinweis: 'İlk denemede doğru cevaplanan her soru 10 puan.',
    },
    texte: [
      'Ellerde mikroplar vardır. Mikropları göremezsin. Mikroplar hastalık yapabilir. Bu yüzden eller dezenfekte edilir. Yani mikroplar yok edilir.\nNe zaman? Bir insanla çalışmadan önce ve sonra.\nNasıl yapılır:\n1. Yüzükleri ve saati çıkar.\n2. Bir avuç dezenfektan al.\n3. Dezenfektanı iyice ov. Her yere. Parmak uçlarına ve başparmağa da.\n4. En az 30 saniye ov.',
      'Hastalık yapan mikropların çoğu eller yoluyla bulaşır. Bu nedenle bakımda eller dezenfekte edilir – örneğin her hasta temasından önce ve sonra. Önce yüzükler ve saat çıkarılır, çünkü altlarında mikroplar kalabilir. Bir avuç dolusu dezenfektan (yaklaşık 3–5 ml) alınır ve kuru ellere ovulur. Eller en az 30 saniye boyunca nemli kalmalıdır. En sık unutulan yerler parmak uçları ve başparmaklardır.',
      'Hijyenik el dezenfeksiyonu, hastane enfeksiyonlarını (nozokomiyal enfeksiyonlar) önlemede en önemli tekil önlemdir. Diğerlerinin yanı sıra hasta temasından önce ve sonra, aseptik işlemlerden önce ve potansiyel olarak enfeksiyöz materyalle temastan sonra endikedir. Takı, saat ve takma tırnaklar, mikrop azaltımını olumsuz etkilediği için kabul edilmez. Kuru ellere 3–5 ml alkollü preparat alınır ve en az 30 saniyelik etki süresi boyunca ovulur. Islanmayan bölgeler en sık parmak uçlarında ve başparmaklarda görülür.',
    ],
    fragen: [
      [
        { frage: 'Dezenfektanı ne kadar süre ovarsın?', optionen: ['10 saniye', 'En az 30 saniye', '5 dakika'] },
        { frage: 'Neyi sık unutursun?', optionen: ['Ön kolu', 'Elin üstünü', 'Parmak uçlarını ve başparmağı'] },
        { frage: 'Önce yüzüklerle ve saatle ne yaparsın?', optionen: ['Çıkarırım', 'Takılı bırakırım', 'Üzerlerine dezenfektan sıkarım'] },
      ],
      [
        { frage: 'Eller en az ne kadar süre nemli kalmalı?', optionen: ['10 saniye', '30 saniye', '5 dakika'] },
        { frage: 'Hangi yerler özellikle sık unutulur?', optionen: ['Ön kollar', 'Ellerin üstü', 'Parmak uçları ve başparmaklar'] },
        { frage: 'Yüzükler ve saat neden önceden çıkarılır?', optionen: ['Altlarında mikroplar kalabildiği için', 'Çalışırken rahatsız ettikleri için', 'Dezenfektan onlara zarar verdiği için'] },
      ],
      [
        { frage: 'Minimum etki süresi ne kadardır?', optionen: ['10 saniye', '30 saniye', '5 dakika'] },
        { frage: 'Islanmayan bölgeler en sık nerede görülür?', optionen: ['Ön kollarda', 'Elin sırtında', 'Parmak uçlarında ve başparmaklarda'] },
        { frage: 'Takılar neden kabul edilmez?', optionen: ['Mikrop azaltımını olumsuz etkiler', 'Dokümantasyonu zorlaştırır', 'Preparat tarafından zarar görür'] },
      ],
    ],
  },

  ru: {
    titel: 'Гигиена рук',
    niveaus: ['Простой язык', 'Стандарт', 'Профессиональный язык'],
    ui: {
      sprache: 'Язык', niveau: 'Уровень', vorlesen: '🔊 Прочитать вслух', stopp: '⏹ Стоп', fragen: 'Вопросы',
      richtig: 'Правильно!', falsch: 'К сожалению, неправильно – попробуй ещё раз.',
      fertig: 'Отлично! Ты правильно ответил(а) на все вопросы.',
      keineStimme: 'На твоём телефоне нет голоса для этого языка.',
      hinweis: '10 баллов за каждый вопрос, на который ты ответишь правильно с первой попытки.',
    },
    texte: [
      'На руках есть микробы. Микробов не видно. Микробы могут вызвать болезнь. Поэтому руки дезинфицируют. Это значит: микробы уничтожают.\nКогда? До и после работы с человеком.\nКак это делать:\n1. Снять кольца и часы.\n2. Взять полную горсть дезинфицирующего средства.\n3. Хорошо растереть средство. Везде. Также кончики пальцев и большой палец.\n4. Растирать минимум 30 секунд.',
      'Большинство возбудителей болезней передаётся через руки. Поэтому в уходе за больными руки дезинфицируют – например, до и после каждого контакта с пациентом или пациенткой. Перед этим снимают кольца и часы, потому что под ними могут оставаться микробы. Берут полную горсть дезинфицирующего средства (примерно 3–5 мл) и втирают его в сухие руки. Руки должны оставаться влажными не меньше 30 секунд. Чаще всего забывают кончики пальцев и большие пальцы.',
      'Гигиеническая антисептика рук – важнейшая отдельная мера профилактики внутрибольничных (нозокомиальных) инфекций. Она показана, в частности, до и после контакта с пациентом, перед асептическими манипуляциями, а также после контакта с потенциально инфицированным материалом. Украшения, часы и искусственные ногти недопустимы, так как они снижают эффективность уничтожения возбудителей. На сухие руки наносят 3–5 мл спиртосодержащего средства и втирают в течение всего времени экспозиции – не менее 30 секунд. Необработанные участки чаще всего остаются на кончиках пальцев и больших пальцах.',
    ],
    fragen: [
      [
        { frage: 'Как долго нужно растирать средство?', optionen: ['10 секунд', 'Минимум 30 секунд', '5 минут'] },
        { frage: 'Что часто забывают?', optionen: ['Предплечье', 'Тыльную сторону кисти', 'Кончики пальцев и большой палец'] },
        { frage: 'Что делают перед этим с кольцами и часами?', optionen: ['Снимают', 'Оставляют', 'Брызгают на них средством'] },
      ],
      [
        { frage: 'Сколько времени руки должны оставаться влажными как минимум?', optionen: ['10 секунд', '30 секунд', '5 минут'] },
        { frage: 'Какие места забывают особенно часто?', optionen: ['Предплечья', 'Тыльную сторону кисти', 'Кончики пальцев и большие пальцы'] },
        { frage: 'Почему перед этим снимают кольца и часы?', optionen: ['Потому что под ними могут оставаться микробы', 'Потому что они мешают работать', 'Потому что средство их портит'] },
      ],
      [
        { frage: 'Каково минимальное время экспозиции?', optionen: ['10 секунд', '30 секунд', '5 минут'] },
        { frage: 'Где чаще всего остаются необработанные участки?', optionen: ['На предплечьях', 'На тыльной стороне кисти', 'На кончиках пальцев и больших пальцах'] },
        { frage: 'Почему украшения недопустимы?', optionen: ['Они снижают эффективность уничтожения возбудителей', 'Они мешают ведению документации', 'Средство их повреждает'] },
      ],
    ],
  },

  uk: {
    titel: 'Гігієна рук',
    niveaus: ['Проста мова', 'Стандарт', 'Фахова мова'],
    ui: {
      sprache: 'Мова', niveau: 'Рівень', vorlesen: '🔊 Прочитати вголос', stopp: '⏹ Стоп', fragen: 'Запитання',
      richtig: 'Правильно!', falsch: 'На жаль, неправильно – спробуй ще раз.',
      fertig: 'Чудово! Ти правильно відповів(-ла) на всі запитання.',
      keineStimme: 'На твоєму телефоні немає голосу для цієї мови.',
      hinweis: '10 балів за кожне запитання, на яке ти правильно відповіси з першої спроби.',
    },
    texte: [
      'На руках є мікроби. Мікробів не видно. Мікроби можуть спричинити хворобу. Тому руки дезінфікують. Це означає: мікроби знищують.\nКоли? До і після роботи з людиною.\nЯк це робити:\n1. Зняти каблучки та годинник.\n2. Взяти повну жменю дезінфекційного засобу.\n3. Добре розтерти засіб. Скрізь. Також кінчики пальців і великий палець.\n4. Розтирати щонайменше 30 секунд.',
      'Більшість збудників хвороб передається через руки. Тому в догляді руки дезінфікують – наприклад, до і після кожного контакту з пацієнтом або пацієнткою. Перед цим знімають каблучки та годинник, бо під ними можуть залишатися мікроби. Беруть повну жменю дезінфекційного засобу (приблизно 3–5 мл) і втирають у сухі руки. Руки мають залишатися вологими щонайменше 30 секунд. Найчастіше забувають кінчики пальців і великі пальці.',
      'Гігієнічна антисептика рук – найважливіший окремий захід профілактики внутрішньолікарняних (нозокоміальних) інфекцій. Вона показана, зокрема, до і після контакту з пацієнтом, перед асептичними маніпуляціями, а також після контакту з потенційно інфікованим матеріалом. Прикраси, годинники та штучні нігті неприпустимі, оскільки вони знижують ефективність знищення збудників. На сухі руки наносять 3–5 мл спиртовмісного засобу і втирають протягом усього часу експозиції – щонайменше 30 секунд. Необроблені ділянки найчастіше залишаються на кінчиках пальців і великих пальцях.',
    ],
    fragen: [
      [
        { frage: 'Як довго треба розтирати засіб?', optionen: ['10 секунд', 'Щонайменше 30 секунд', '5 хвилин'] },
        { frage: 'Що часто забувають?', optionen: ['Передпліччя', 'Тильний бік кисті', 'Кінчики пальців і великий палець'] },
        { frage: 'Що роблять перед цим із каблучками та годинником?', optionen: ['Знімають', 'Залишають', 'Бризкають на них засобом'] },
      ],
      [
        { frage: 'Скільки часу руки мають залишатися вологими щонайменше?', optionen: ['10 секунд', '30 секунд', '5 хвилин'] },
        { frage: 'Які місця забувають особливо часто?', optionen: ['Передпліччя', 'Тильний бік кисті', 'Кінчики пальців і великі пальці'] },
        { frage: 'Чому перед цим знімають каблучки та годинник?', optionen: ['Бо під ними можуть залишатися мікроби', 'Бо вони заважають працювати', 'Бо засіб їх псує'] },
      ],
      [
        { frage: 'Яким є мінімальний час експозиції?', optionen: ['10 секунд', '30 секунд', '5 хвилин'] },
        { frage: 'Де найчастіше залишаються необроблені ділянки?', optionen: ['На передпліччях', 'На тильному боці кисті', 'На кінчиках пальців і великих пальцях'] },
        { frage: 'Чому прикраси неприпустимі?', optionen: ['Вони знижують ефективність знищення збудників', 'Вони заважають веденню документації', 'Засіб їх пошкоджує'] },
      ],
    ],
  },

  fr: {
    titel: 'Hygiène des mains',
    niveaus: ['Langage simple', 'Standard', 'Langage professionnel'],
    ui: {
      sprache: 'Langue', niveau: 'Niveau', vorlesen: '🔊 Lire à voix haute', stopp: '⏹ Arrêter', fragen: 'Questions',
      richtig: 'Correct !', falsch: 'Malheureusement faux – essaie encore une fois.',
      fertig: 'Bravo ! Tu as répondu correctement à toutes les questions.',
      keineStimme: 'Ton téléphone n’a pas de voix pour cette langue.',
      hinweis: '10 points pour chaque question réussie du premier coup.',
    },
    texte: [
      'Sur les mains, il y a des microbes. On ne voit pas les microbes. Les microbes peuvent rendre malade. C’est pourquoi on désinfecte les mains. Cela veut dire : on détruit les microbes.\nQuand ? Avant et après le travail avec une personne.\nComment faire :\n1. Enlever les bagues et la montre.\n2. Prendre un creux de main de désinfectant.\n3. Bien frotter le produit. Partout. Aussi le bout des doigts et le pouce.\n4. Frotter au moins 30 secondes.',
      'La plupart des agents pathogènes se transmettent par les mains. C’est pourquoi, dans les soins, on désinfecte les mains – par exemple avant et après chaque contact avec une patiente ou un patient. Avant, on retire les bagues et la montre, car des germes peuvent rester en dessous. On prend un creux de main de produit désinfectant (environ 3 à 5 ml) et on le frotte sur les mains sèches. Les mains doivent rester humides pendant au moins 30 secondes. Les endroits les plus souvent oubliés sont le bout des doigts et les pouces.',
      'La désinfection hygiénique des mains est la mesure isolée la plus importante pour prévenir les infections nosocomiales. Elle est indiquée notamment avant et après un contact avec le patient, avant un geste aseptique ainsi qu’après un contact avec du matériel potentiellement infectieux. Les bijoux, les montres et les faux ongles sont proscrits, car ils diminuent la réduction des germes. On applique 3 à 5 ml d’un produit hydroalcoolique sur les mains sèches et on frictionne pendant tout le temps de contact, d’au moins 30 secondes. Les zones oubliées se situent le plus souvent au bout des doigts et aux pouces.',
    ],
    fragen: [
      [
        { frage: 'Combien de temps frotte-t-on le produit ?', optionen: ['10 secondes', 'Au moins 30 secondes', '5 minutes'] },
        { frage: 'Qu’est-ce qu’on oublie souvent ?', optionen: ['L’avant-bras', 'Le dos de la main', 'Le bout des doigts et le pouce'] },
        { frage: 'Que fait-on avant avec les bagues et la montre ?', optionen: ['On les enlève', 'On les garde', 'On les vaporise de produit'] },
      ],
      [
        { frage: 'Pendant combien de temps les mains doivent-elles rester humides au minimum ?', optionen: ['10 secondes', '30 secondes', '5 minutes'] },
        { frage: 'Quels endroits sont oubliés particulièrement souvent ?', optionen: ['Les avant-bras', 'Le dos des mains', 'Le bout des doigts et les pouces'] },
        { frage: 'Pourquoi retire-t-on avant les bagues et la montre ?', optionen: ['Parce que des germes peuvent rester en dessous', 'Parce qu’elles gênent pendant le travail', 'Parce que le produit les abîme'] },
      ],
      [
        { frage: 'Quel est le temps de contact minimal ?', optionen: ['10 secondes', '30 secondes', '5 minutes'] },
        { frage: 'Où se situent le plus souvent les zones oubliées ?', optionen: ['Sur les avant-bras', 'Sur le dos de la main', 'Au bout des doigts et aux pouces'] },
        { frage: 'Pourquoi les bijoux sont-ils proscrits ?', optionen: ['Ils diminuent la réduction des germes', 'Ils gênent la documentation', 'Ils sont abîmés par le produit'] },
      ],
    ],
  },

  es: {
    titel: 'Higiene de manos',
    niveaus: ['Lenguaje sencillo', 'Estándar', 'Lenguaje técnico'],
    ui: {
      sprache: 'Idioma', niveau: 'Nivel', vorlesen: '🔊 Leer en voz alta', stopp: '⏹ Parar', fragen: 'Preguntas',
      richtig: '¡Correcto!', falsch: 'Lo siento, es incorrecto – inténtalo otra vez.',
      fertig: '¡Muy bien! Has respondido correctamente a todas las preguntas.',
      keineStimme: 'Tu móvil no tiene voz para este idioma.',
      hinweis: '10 puntos por cada pregunta acertada al primer intento.',
    },
    texte: [
      'En las manos hay gérmenes. Los gérmenes no se ven. Los gérmenes pueden enfermarnos. Por eso se desinfectan las manos. Eso significa: se eliminan los gérmenes.\n¿Cuándo? Antes y después de trabajar con una persona.\nCómo se hace:\n1. Quitarse los anillos y el reloj.\n2. Llenar el hueco de la mano con desinfectante.\n3. Frotar bien el producto. Por todas partes. También las puntas de los dedos y el pulgar.\n4. Frotar al menos 30 segundos.',
      'La mayoría de los agentes patógenos se transmiten a través de las manos. Por eso, en los cuidados de enfermería se desinfectan las manos, por ejemplo, antes y después de cada contacto con una paciente o un paciente. Antes se quitan los anillos y el reloj, porque debajo pueden quedar gérmenes. Se llena el hueco de la mano con desinfectante (unos 3–5 ml) y se frota sobre las manos secas. Las manos deben permanecer húmedas al menos 30 segundos. Lo que más se olvida son las puntas de los dedos y los pulgares.',
      'La desinfección higiénica de manos es la medida individual más importante para prevenir las infecciones nosocomiales. Está indicada, entre otros casos, antes y después del contacto con el paciente, antes de procedimientos asépticos y después del contacto con material potencialmente infeccioso. Las joyas, los relojes y las uñas artificiales no están permitidos, ya que reducen la eliminación de microorganismos. Se aplican 3–5 ml de un preparado alcohólico sobre las manos secas y se frotan durante todo el tiempo de acción de al menos 30 segundos. Las zonas sin cubrir aparecen con mayor frecuencia en las yemas de los dedos y en los pulgares.',
    ],
    fragen: [
      [
        { frage: '¿Cuánto tiempo se frota el producto?', optionen: ['10 segundos', 'Al menos 30 segundos', '5 minutos'] },
        { frage: '¿Qué se olvida a menudo?', optionen: ['El antebrazo', 'El dorso de la mano', 'Las puntas de los dedos y el pulgar'] },
        { frage: '¿Qué se hace antes con los anillos y el reloj?', optionen: ['Quitárselos', 'Dejárselos puestos', 'Rociarlos con producto'] },
      ],
      [
        { frage: '¿Cuánto tiempo deben permanecer húmedas las manos como mínimo?', optionen: ['10 segundos', '30 segundos', '5 minutos'] },
        { frage: '¿Qué zonas se olvidan con especial frecuencia?', optionen: ['Los antebrazos', 'El dorso de las manos', 'Las puntas de los dedos y los pulgares'] },
        { frage: '¿Por qué se quitan antes los anillos y el reloj?', optionen: ['Porque debajo pueden quedar gérmenes', 'Porque molestan al trabajar', 'Porque el producto los estropea'] },
      ],
      [
        { frage: '¿Cuál es el tiempo de acción mínimo?', optionen: ['10 segundos', '30 segundos', '5 minutos'] },
        { frage: '¿Dónde aparecen con mayor frecuencia las zonas sin cubrir?', optionen: ['En los antebrazos', 'En el dorso de la mano', 'En las yemas de los dedos y los pulgares'] },
        { frage: '¿Por qué no se permiten las joyas?', optionen: ['Reducen la eliminación de microorganismos', 'Dificultan la documentación', 'El producto las daña'] },
      ],
    ],
  },
};
