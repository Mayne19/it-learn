import type { Chapter } from "./types"

export const DYNSPRACHEN_CHAPTERS: Chapter[] = [
  {
    id: 1,
    fr: "Langages dynamiques",
    de: "Dynamische Sprachen",
    lang: "python",
    concepts: ["dynamische Typisierung", "Interpreter", "Compiler", "Skriptsprachen", "statische vs dynamische Typisierung", "Duck Typing", "1GL/3GL/4GL"],
    summary: "Dynamische Sprachen (Skriptsprachen) werden interpretiert, nicht kompiliert. Dynamische Typisierung: Variablentyp wird zur Laufzeit ermittelt und kann sich ändern. Statische Typisierung (Java, C#): Typ zur Kompilierzeit festgelegt. Beispiele für dynamische Sprachen: Python, Perl, Ruby, JavaScript, PHP. Duck Typing: 'Wenn es wie eine Ente quakt, ist es eine Ente.'"
  },
  {
    id: 2,
    fr: "Éléments fondamentaux Python",
    de: "Grundlegende Python-Elemente",
    lang: "python",
    concepts: ["int", "float", "str", "bool", "NoneType", "type()", "print()", "input()", "Schlüsselwörter", "f-String", "%-Formatierung", "raw-String", "dynamische Typisierung", "starke Typisierung"],
    summary: "Python: dynamisch und stark typisiert, interpretiert. Datentypen: int, float, complex, str, bool, NoneType. type() zeigt Datentyp. Kein Semikolon am Zeilenende. String-Verkettung: +. Formatierung: %-Operator, format(), f-Strings (f'Hallo {name}'). Raw-Strings: r'...' (Backslash wird ignoriert). Kommentare: # einzeilig, '''...''' mehrzeilig."
  },
  {
    id: 3,
    fr: "Structures de contrôle",
    de: "Kontrollstrukturen",
    lang: "python",
    concepts: ["if/elif/else", "while", "for", "break", "continue", "pass", "Einrückung", "and/or/not", "for-in", "range()", "kopfgesteuert"],
    summary: "Python-Kontrollstrukturen basieren AUSSCHLIESSLICH auf Einrückung — kein {}, kein begin/end! Doppelpunkt am Zeilenende. if/elif/else für Verzweigungen. while: kopfgesteuerte Schleife (kein do-while!). for...in: Iteration über Sequenzen. break: Schleife verlassen. continue: nächster Durchlauf. pass: Leer-Anweisung/Platzhalter. Logische Operatoren: and, or, not (statt &&, ||, !)."
  },
  {
    id: 4,
    fr: "Structures de données",
    de: "Datenstrukturen",
    lang: "python",
    concepts: ["list", "tuple", "dict", "set", "list comprehension", "range()", "mutable/immutable", "Slicing", "append()", "len()", "sorted()", "Dictionary", "Bytes", "ByteArray"],
    summary: "list []: geordnet, mutable, Duplikate erlaubt. tuple (): geordnet, immutable (unveränderlich). dict {key:val}: Key-Value-Paare, Keys unique und case-sensitiv. set {}: ungeordnet, keine Duplikate. Slicing: seq[start:stop:step]. List Comprehension: [expr for x in liste if bedingung]. Strings sind immutable Sequenzen von Unicode-Zeichen. bytes: immutable Bytefolge, bytearray: mutable."
  },
  {
    id: 5,
    fr: "Fonctions",
    de: "Funktionen",
    lang: "python",
    concepts: ["def", "return", "optionale Parameter", "Default-Werte", "*args", "**kwargs", "scope", "global", "yield", "call-by-value", "call-by-reference", "Namensräume"],
    summary: "def name(params): für Funktionsdefinition. return gibt Wert(e) zurück (auch mehrere!). Optionale Parameter: zwingend am Ende, zwingend mit Default-Wert. *args = beliebig viele Positional-Args (als Tupel). **kwargs = beliebig viele Keyword-Args (als Dict). yield: Generatorfunktion (gibt Werte stückweise zurück). Lokale Variablen überdecken globale. global-Schlüsselwort für expliziten globalen Zugriff."
  },
  {
    id: 6,
    fr: "Modules et packages",
    de: "Module und Packages",
    lang: "python",
    concepts: ["import", "from...import", "pip", "package", "__init__.py", "__name__", "__main__", "virtuelle Umgebung", "Modul"],
    summary: "import modul fügt Modul ein. from modul import funktion für gezielten Import. as für Alias. pip install: Package-Manager. Package = Ordner mit __init__.py und mehreren Modulen. __name__ == '__main__': Code wird nur bei direkter Ausführung ausgeführt (nicht bei Import). Virtuelle Umgebung (venv): isoliert Projekt-Abhängigkeiten."
  },
  {
    id: 7,
    fr: "Gestion des erreurs",
    de: "Fehlerbehandlung",
    lang: "python",
    concepts: ["try/except/else/finally", "raise", "Exception", "BaseException", "ZeroDivisionError", "ValueError", "TypeError", "IOError", "IndexError", "eigene Exceptions"],
    summary: "try: riskanter Code. except ExceptionType as e: Fehlerbehandlung (mehrere except-Blöcke möglich). else: wird ausgeführt wenn KEIN Fehler im try-Block. finally: wird IMMER ausgeführt (Aufräumarbeiten). raise: Exception selbst auslösen. Eigene Exceptions: class MeinFehler(Exception): pass. BaseException > Exception > konkrete Exceptions."
  },
  {
    id: 8,
    fr: "Fichiers",
    de: "Dateien",
    lang: "python",
    concepts: ["open()", "close()", "read()", "write()", "readline()", "readlines()", "with", "Dateimodi r/w/a/rb/wb", "seek()", "tell()", "IOError", "writelines()"],
    summary: "open(datei, modus) öffnet Datei, close() schließt. Modi: r=lesen (default), w=schreiben (überschreibt!), a=anhängen, rb/wb=binär. with open() as f: schließt automatisch (empfohlen!). read() = ganzen Inhalt als String. readline() = eine Zeile. readlines() = Liste aller Zeilen. write() schreibt String. seek(pos, von) navigiert in Binärdateien. tell() gibt aktuelle Position."
  },
  {
    id: 9,
    fr: "Interface système d'exploitation",
    de: "Schnittstelle zum Betriebssystem",
    lang: "python",
    concepts: ["os", "os.path", "sys", "platform", "sys.argv", "sys.exit()", "os.getcwd()", "os.listdir()", "os.path.join()", "Kommandozeilenargumente"],
    summary: "os: Betriebssystem-Funktionen (getcwd=aktuelles Verzeichnis, listdir, system, environ). os.path: plattformunabhängige Pfad-Operationen (join, exists, isfile, isdir, basename, dirname). sys.argv: Kommandozeilen-Argumente als Liste (argv[0] = Skriptname). sys.exit(code): Programm beenden (0=OK). platform: Hardware-/OS-Informationen (system, machine, node)."
  },
  {
    id: 10,
    fr: "Accès aux bases de données",
    de: "Datenbankzugriff",
    lang: "python",
    concepts: ["MySQLdb", "sqlite3", "Cursor", "execute()", "fetchall()", "fetchone()", "commit()", "connect()", "Platzhalter %s", "SQL-Injection", "autocommit"],
    summary: "MySQLdb (MySQL) oder sqlite3 (SQLite, kein Server nötig). connection = MySQLdb.connect(host, user, passwd, database). cursor = connection.cursor(). cursor.execute(sql, params_tuple): SQL ausführen. fetchall() = alle Ergebniszeilen als Liste von Tupeln. fetchone() = eine Zeile. commit() nach INSERT/UPDATE/DELETE! %s als Platzhalter (SQL-Injection-Schutz!). close() auf Cursor und Connection."
  },
  {
    id: 11,
    fr: "Expressions régulières",
    de: "Reguläre Ausdrücke",
    lang: "python",
    concepts: ["re", "search()", "findall()", "sub()", "split()", "group()", "compile()", "Metazeichen", "Quantifier *+?{}", "Zeichenklassen []", "Anker ^/$", "greedy/non-greedy"],
    summary: "import re. re.search(pattern, string): erstes Vorkommen, gibt Match-Objekt oder None. re.findall(): alle Treffer als Liste. re.sub(pattern, repl, string): suchen und ersetzen. Metazeichen: . (beliebig), ^ (Anfang), $ (Ende), * (0+), + (1+), ? (0-1). Zeichenklassen: [abc], \\d=Ziffern, \\w=Wortzeichen, \\s=Leerzeichen. group() auf Match-Objekt. Greedy (default) vs non-greedy (?): +? *?"
  },
  {
    id: 12,
    fr: "Programmation web",
    de: "Web-Programmierung",
    lang: "python",
    concepts: ["HTTP", "GET/POST", "CGI", "WSGI", "HTML-Formulare", "URL-Encoding", "urllib.parse", "environ", "QUERY_STRING", "REQUEST_METHOD"],
    summary: "HTTP: Client sendet GET/POST-Request, Server antwortet. CGI: ältere Schnittstelle Webserver↔Python. WSGI: modernere Schnittstelle (wsgiref.simple_server). application(environ, start_response): WSGI-Funktion. GET: Parameter in URL als QUERY_STRING. POST: Daten in wsgi.input, Länge in CONTENT_LENGTH. urllib.parse.parse_qs() für URL-Dekodierung. URL-Encoding: Leerzeichen=+, Sonderzeichen=%XX."
  },
  {
    id: 13,
    fr: "Programmation orientée objet",
    de: "Objektorientierung",
    lang: "python",
    concepts: ["class", "__init__", "self", "Vererbung", "Überschreiben", "__str__", "super()", "property", "@classmethod", "@staticmethod", "Mehrfachvererbung", "__del__", "mutable/immutable"],
    summary: "class Name: Klassendefinition. __init__(self): Konstruktor (kein Rückgabetyp!). self = Referenz auf Instanz (immer erster Parameter). Vererbung: class Kind(Eltern). Überschreiben: Methode in Unterklasse neu implementieren. super().__init__() ruft Eltern-Konstruktor auf. __str__: String-Darstellung (für print/str()). Python: kein echtes private (Konvention: __ = private, _ = protected). Mehrfachvererbung möglich!"
  },
  {
    id: 14,
    fr: "Fonctions intégrées",
    de: "Built-In Functions",
    lang: "python",
    concepts: ["map()", "filter()", "zip()", "lambda", "eval()", "exec()", "all()", "any()", "abs()", "sorted()", "enumerate()", "isinstance()"],
    summary: "lambda params: ausdruck = anonyme Funktion (nur ein Ausdruck, kein Block!). map(func, iterable): Funktion auf alle Elemente anwenden → Iterator. filter(func, iterable): Elemente filtern wo func=True → Iterator. zip(l1, l2): Listen parallel zusammenführen als Tupel. all(iterable): True wenn alle True. any(iterable): True wenn mindestens eines True. eval(string): Ausdruck dynamisch auswerten. exec(string): Code dynamisch ausführen."
  },
  {
    id: 15,
    fr: "Exemples pratiques",
    de: "Praxisbeispiele",
    lang: "python",
    concepts: ["neuronale Netze", "TensorFlow", "Keras", "MNIST", "Web-Scraping", "requests", "BeautifulSoup", "RSS-Feed", "PDF herunterladen", "Bilderkennung"],
    summary: "Neuronale Netze: TensorFlow/Keras, MNIST-Datensatz (handgeschriebene Ziffern), Sequential-Modell, Dense-Layer, Aktivierungsfunktionen (relu, softmax). Web-Scraping: requests für HTTP-Anfragen, BeautifulSoup für HTML-Parsing. RSS-Feed parsen und BGH-Urteile automatisch als PDF herunterladen — Kombination: requests + Dateioperationen."
  },
  {
    id: 16,
    fr: "Perl — bases",
    de: "Weitere dynamische Sprachen — Perl",
    lang: "perl",
    concepts: ["$skalare", "@arrays", "%hashes", "Sigil", "use strict", "use warnings", "chomp()", "print", "Kontrollstrukturen", "Stringoperatoren"],
    summary: "Perl: $variable=Skalar, @array=Liste, %hash=Dictionary. Sigile ($/@/%) kennzeichnen Variablentyp. use strict; use warnings; empfohlen. chomp() entfernt Zeilenende-Zeichen. print 'text'; für Ausgabe. Kontrollstrukturen ähnlich wie C/Java (mit {}). Strings: . für Verkettung (nicht +!). Verbreitet für Textverarbeitung, Systemadministration, Bioinformatik."
  },
  {
    id: 17,
    fr: "JavaScript — bases",
    de: "Weitere dynamische Sprachen — JavaScript",
    lang: "javascript",
    concepts: ["var/let/const", "function", "Objekte", "Arrays", "typeof", "Kontrollstrukturen", "Prototypen", "Event-Handler", "DOM", "dynamische Typisierung"],
    summary: "JavaScript: var (function-scoped, veraltet), let/const (block-scoped, modern). Dynamische Typisierung wie Python. Objekte als Key-Value-Paare: {}. Arrays: []. Funktionen sind First-Class-Objects (können als Parameter übergeben werden). typeof-Operator. Kontrollstrukturen wie Java/C (mit {}). Läuft im Browser (DOM-Manipulation) und auf Server (Node.js). Prototypen-basierte Vererbung."
  },
]
