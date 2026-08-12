import type { Chapter } from "./types"

export const DYNSPRACHEN_CHAPTERS: Chapter[] = [
  {
    id: 1,
    fr: "Langages dynamiques",
    de: "Dynamische Sprachen",
    lang: "python",
    hasCode: false,
    klausurRelevant: true,
    concepts: ["dynamische Typisierung", "Interpreter", "Compiler", "Skriptsprachen", "statische vs dynamische Typisierung", "Duck Typing", "1GL/3GL/4GL", "starke vs schwache Typisierung"],
    summary: "Dynamische Sprachen (Skriptsprachen) werden interpretiert, nicht kompiliert. Dynamische Typisierung: Variablentyp wird zur Laufzeit ermittelt und kann sich ändern. Statische Typisierung (Java, C#, TypeScript): Typ zur Kompilierzeit festgelegt — ein Typfehler wird schon vor der Ausführung gemeldet, nicht erst zur Laufzeit. Achtung: Ob eine Sprache stark oder schwach typisiert ist, ist eine ANDERE Eigenschaft als statisch/dynamisch — ein Typfehler beim Ausführungsversuch zeigt nur, dass NICHT dynamisch typisiert wurde, sagt aber nichts über stark/schwach aus. Beispiele für dynamische Sprachen: Python, Perl, Ruby, JavaScript, PHP. Duck Typing: 'Wenn es wie eine Ente quakt, ist es eine Ente.'"
  },
  {
    id: 2,
    fr: "Éléments fondamentaux Python",
    de: "Grundlegende Python-Elemente",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["int", "float", "complex", "str", "bool", "NoneType", "type()", "print()", "input()", "Schlüsselwörter", "f-String", "%-Formatierung", "raw-String", "dynamische Typisierung", "starke Typisierung", "Byte-Code", "IDLE"],
    summary: "Python: dynamisch und stark typisiert, interpretiert (erzeugt beim Start Byte-Code, der dann interpretiert wird). Datentypen: int, float, complex (Realteil + Imaginärteil, z.B. 3+4j — Magnitude über abs()), str, bool, NoneType. type() zeigt Datentyp. IDLE = mitgelieferte Standard-Entwicklungsumgebung. Kein Semikolon am Zeilenende (Zeilenende = Anweisungsende). String-Verkettung NUR mit gleichem Typ: 'a' + str(42), NICHT 'a' + 42 (TypeError!). Formatierung: %-Operator (bei mehreren Werten Tupel nötig: '%s %s' % (a, b)), format(), f-Strings (f'Hallo {name}'). Raw-Strings: r'...' (Backslash wird ignoriert, nützlich für Pfade/Regex). Kommentare: # einzeilig (Teil nach # = Kommentar), '''...'''/\"\"\"...\"\"\" mehrzeilig (auch als String-Literal nutzbar). input() liest Tastatureingabe als str."
  },
  {
    id: 3,
    fr: "Structures de contrôle",
    de: "Kontrollstrukturen",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["if/elif/else", "while", "for", "break", "continue", "pass", "Einrückung", "and/or/not", "for-in", "range()", "kopfgesteuert", "Vergleichsoperatoren"],
    summary: "Python-Kontrollstrukturen basieren AUSSCHLIESSLICH auf Einrückung — kein {}, kein begin/end! Doppelpunkt am Zeilenende (Doppelpunkt fehlt = klassischer Syntaxfehler). if/elif/else für Verzweigungen (elif, NICHT 'else if'). while: kopfgesteuerte Schleife (kein do-while in Python!). for...in: Iteration über Sequenzen (Listen, Strings, range()). break: Schleife komplett verlassen. continue: sofort zum nächsten Durchlauf springen (Rest des Blocks wird übersprungen). pass: Leer-Anweisung/Platzhalter, wenn syntaktisch ein Block nötig ist. Logische Operatoren: and, or, not (statt &&, ||, ! — diese existieren in Python nicht!). Vergleich: ==, !=, <, >, <=, >=."
  },
  {
    id: 4,
    fr: "Structures de données",
    de: "Datenstrukturen",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["list", "tuple", "dict", "set", "list comprehension", "range()", "mutable/immutable", "Slicing", "append()", "insert()", "reverse()", "len()", "sorted()", "Dictionary", "bytes", "bytearray", "intersection()", "isdisjoint()", "String-Sequenz", "join()", "split()", "strip()", "endswith()"],
    summary: "list []: geordnet, mutable, Duplikate erlaubt (insert(i, x) fügt an Index i ein, reverse() dreht in-place um, append() hängt an). tuple (): geordnet, immutable (unveränderlich). dict {key:val}: Key-Value-Paare, Keys unique und case-sensitiv. set {}: ungeordnet, KEINE Sequenz (keine Slicing/Indizierung!), keine Duplikate — intersection() liefert Schnittmenge, isdisjoint() prüft ob zwei Sets keine gemeinsamen Elemente haben. range(start, stop, step): stop ist EXKLUSIV, list(range(...)) wandelt in Liste um. Slicing: seq[start:stop:step] — funktioniert für list, tuple, str, bytes, bytearray (die 'Sequenzen'), NICHT für set/dict. List Comprehension: [expr for x in liste if bedingung]. Strings sind immutable Sequenzen von Unicode-Zeichen — s[0]='X' geht NICHT (TypeError), Stringvergleich ist lexikografisch (z.B. 'Aachen' < 'Zypern'). String-Methoden: strip() entfernt Leerzeichen (NICHT 'trim'!), split() liefert eine Liste, join() ist eine String-Methode die eine Sequenz zu einem String verbindet (Trennzeichen.join(liste)), endswith() für Suffix-Prüfung (kombiniert mit lower()/upper() für case-insensitiv), letztes Zeichen: s[-1]. bytes: immutable Bytefolge (Literal-Präfix b'...'), bytearray: mutable Variante — beide auch aus String + Encoding erzeugbar."
  },
  {
    id: 5,
    fr: "Fonctions",
    de: "Funktionen",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["def", "return", "optionale Parameter", "Default-Werte", "*args", "**kwargs", "scope", "global", "UnboundLocalError", "yield", "call-by-value", "call-by-reference", "Namensräume", "Positions- vs Keyword-Argumente"],
    summary: "def name(params): für Funktionsdefinition. return gibt Wert(e) zurück (auch mehrere, als Tupel!). Optionale Parameter (mit Default-Wert) MÜSSEN nach den Pflichtparametern stehen — def f(x, y=1, z) ist UNGÜLTIG. *args = beliebig viele Positional-Args (als Tupel), **kwargs = beliebig viele Keyword-Args (als Dict) — bei Definition IMMER in der Reihenfolge (normale Params, *args, **kwargs). Beim Aufruf: Keyword-Argumente können in beliebiger Reihenfolge stehen, aber sobald ein Keyword-Arg verwendet wurde, dürfen KEINE Positions-Args mehr folgen. yield: Generatorfunktion (gibt Werte stückweise zurück, statt alles auf einmal). SCOPE-FALLE: Wird eine Variable INNERHALB einer Funktion irgendwo zugewiesen (z.B. note = 2.3), gilt sie im GESAMTEN Funktionskörper als lokal — ein Lesezugriff VOR dieser Zuweisung (z.B. print(note)) wirft dann einen UnboundLocalError, auch wenn eine gleichnamige globale Variable existiert! Lösung: global note am Funktionsanfang deklarieren, um explizit die globale Variable zu meinen und zu verändern."
  },
  {
    id: 6,
    fr: "Modules et packages",
    de: "Module und Packages",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["import", "from...import", "import as", "pip", "package", "__init__.py", "__name__", "__main__", "virtuelle Umgebung", "Modul", "Sub-Package"],
    summary: "import modul fügt gesamtes Modul ein (Zugriff via modul.funktion()). from modul import funktion für gezielten Import einzelner Funktion/Klasse. import modul as alias für Import mit Alias (z.B. import numpy as np). pip install: Package-Manager. Package = Ordner mit __init__.py und mehreren Modulen — Sub-Packages sind Unterordner, die selbst wieder __init__.py enthalten. __name__ == '__main__': bedingte Ausführung — dieser Code läuft NUR bei direktem Skriptstart, NICHT wenn das Modul importiert wird. Virtuelle Umgebung (venv): python -m venv venv, dann aktivieren, dann pip install — isoliert Projekt-Abhängigkeiten."
  },
  {
    id: 7,
    fr: "Gestion des erreurs",
    de: "Fehlerbehandlung",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["try/except/else/finally", "raise", "Exception", "BaseException", "ZeroDivisionError", "ValueError", "TypeError", "KeyError", "IOError", "IndexError", "eigene Exceptions", "Ausführungsreihenfolge try/except/finally"],
    summary: "try: riskanter Code. except ExceptionType as e: Fehlerbehandlung (mehrere except-Blöcke möglich, spezifischste zuerst — der erste passende except-Block wird ausgeführt, danach NICHT die anderen). else: wird nur ausgeführt wenn KEIN Fehler im try-Block auftrat. finally: wird IMMER ausgeführt (bei Erfolg, bei Fehler, sogar bei return im try/except!) — typisch für Aufräumarbeiten (Datei/Verbindung schließen). raise: Exception selbst auslösen, z.B. raise Exception('Text'). Eigene Exceptions: class MeinFehler(Exception): pass. Hierarchie: BaseException > Exception > konkrete Exceptions (ZeroDivisionError, ValueError, TypeError, KeyError, IndexError...) — ein allgemeiner except Exception as e fängt auch spezifischere Fehler, sofern er NACH den spezifischeren except-Blöcken steht."
  },
  {
    id: 8,
    fr: "Fichiers",
    de: "Dateien",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["open()", "close()", "read()", "write()", "readline()", "readlines()", "with", "Dateimodi r/w/a/rb/wb", "seek()", "tell()", "IOError", "writelines()", "chunkweise lesen"],
    summary: "open(datei, modus) öffnet Datei, close() schließt sie wieder. Modi: r=lesen (default), w=schreiben (ACHTUNG: überschreibt bestehenden Inhalt!), a=anhängen (append, Schreibposition ans Ende), rb/wb/ab=Binärmodus-Varianten. with open(...) as f: schließt die Datei automatisch am Blockende, auch bei Fehlern (empfohlen statt manuellem close!) — kann verschachtelt werden (with open(src,'rb') as fs: with open(dst,'wb') as fd:). read() = ganzen Inhalt als String (bzw. read(n) = n Zeichen/Bytes, nützlich für chunkweises Kopieren großer Dateien). readline() = eine Zeile. readlines() = Liste aller Zeilen. write() schreibt String/Bytes, writelines() schreibt eine Liste von Strings. seek(pos) navigiert in Binärdateien, tell() gibt aktuelle Position zurück."
  },
  {
    id: 9,
    fr: "Interface système d'exploitation",
    de: "Schnittstelle zum Betriebssystem",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["os", "os.path", "sys", "platform", "sys.argv", "sys.exit()", "os.getcwd()", "os.listdir()", "os.path.exists()", "os.path.isdir()", "os.path.isfile()", "os.path.abspath()", "os.path.dirname()", "os.path.getsize()", "os.path.splitext()", "Kommandozeilenargumente"],
    summary: "os: Betriebssystem-Funktionen (getcwd=aktuelles Verzeichnis, listdir, system, environ). os.path: plattformunabhängige Pfad-Operationen — exists() prüft Existenz, isdir()/isfile() unterscheiden Verzeichnis/Datei, abspath() liefert vollständigen Pfad, dirname() das Verzeichnis, splitext() trennt (Basisname, Endung) als Tupel, getsize() liefert Dateigröße in Bytes, join() fügt Pfadteile plattformunabhängig zusammen. sys.argv: Kommandozeilen-Argumente als Liste (argv[0] = Skriptname selbst, argv[1:] = die eigentlichen Argumente — len(sys.argv) < 2 prüft ob Argumente fehlen). sys.exit(code): Programm beenden (0=OK). platform: Hardware-/OS-Informationen (system, machine, node)."
  },
  {
    id: 10,
    fr: "Accès aux bases de données",
    de: "Datenbankzugriff",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["MySQLdb", "sqlite3", "Cursor", "Connection", "execute()", "fetchall()", "fetchone()", "commit()", "connect()", "Platzhalter %s", "parametrisierte Abfrage", "SQL-Injection", "autocommit"],
    summary: "MySQLdb (MySQL) oder sqlite3 (SQLite, kein Server nötig). connection = MySQLdb.connect(user=..., passwd=..., db=...). cursor = connection.cursor(). cursor.execute(sql, params_tuple): SQL mit parametrisierter Abfrage ausführen — die Platzhalter %s im SQL-String werden durch das Tupel ersetzt, NIEMALS Werte per String-Verkettung einbauen (SQL-Injection-Gefahr!). fetchall() = alle Ergebniszeilen als Liste von Tupeln. fetchone() = eine Zeile. commit() zwingend nach INSERT/UPDATE/DELETE, sonst werden Änderungen nicht dauerhaft gespeichert! close() sowohl auf Cursor als auch auf Connection aufrufen. Cursor führt die Befehle aus, Connection verwaltet die Verbindung selbst — nicht verwechseln!"
  },
  {
    id: 11,
    fr: "Expressions régulières",
    de: "Reguläre Ausdrücke",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["re", "search()", "findall()", "sub()", "split()", "group()", "compile()", "Metazeichen .", "Quantifier * + ? {min,max}", "Zeichenklassen []", "Anker ^ $", "Wortgrenzen \\b \\B", "Alternative |", "Gruppierung ()", "case-sensitiv", "greedy/non-greedy"],
    summary: "import re. Pattern Matching ist standardmäßig CASE-SENSITIV (Groß/Klein wird unterschieden, außer mit re.I). re.search(pattern, string): erstes Vorkommen, gibt Match-Objekt oder None zurück (Prüfung mit if m:). re.findall(): ALLE nicht-überlappenden Treffer als Liste — Achtung, überlappende Treffer werden NICHT gefunden. re.sub(pattern, repl, string): suchen und ersetzen. re.split(pattern, string): am Muster auftrennen. Metazeichen: . = genau EIN beliebiges Zeichen (außer Newline), \\. = literaler Punkt (Backslash schützt Sonderzeichen). Zeichenklassen: [abc], \\d=Ziffern, \\D=Nicht-Ziffern, \\w=Wortzeichen (Buchstaben/Ziffern/_), \\s=Leerzeichen/Whitespace. Quantifier: + (mind. 1x), * (0 bis beliebig oft), ? (0 oder 1x) — allgemein als {min,max}: {2}=genau 2x, {1,2}=1 bis 2x, {2,}=mind. 2x (Komma ohne Obergrenze = 'mindestens'). Anker: ^ = Stringanfang, $ = Stringende (^...$ zusammen = kompletter String-Vergleich). Wortgrenzen: \\b (an Wortgrenze), \\B (NICHT an Wortgrenze, Vorsicht bei Verwechslung mit \\b!). Alternative: | trennt Muster (a|b), Gruppierung mit (): group(n) liefert den n-ten geklammerten Teiltreffer, group(0)/ohne Argument den Gesamttreffer. Greedy (default, so viel wie möglich) vs non-greedy (mit ?, so wenig wie möglich): +? *?"
  },
  {
    id: 12,
    fr: "Programmation web",
    de: "Web-Programmierung",
    lang: "python",
    hasCode: true,
    klausurRelevant: true,
    concepts: ["HTTP", "GET/POST", "CGI", "WSGI", "HTML-Formulare", "URL-Encoding", "urllib.parse", "environ", "QUERY_STRING", "REQUEST_METHOD", "Content-Type", "start_response"],
    summary: "HTTP: Client sendet GET/POST-Request, Server antwortet. CGI: ältere Schnittstelle Webserver↔Python. WSGI: modernere Schnittstelle (wsgiref.simple_server.make_server). application(environ, start_response): die zentrale WSGI-Funktion — erhält Umgebungsdaten (environ) und eine Callback-Funktion (start_response) zum Setzen von Status/Headers, gibt den Response-Body als Liste von Bytes zurück. Content-Type-Header muss zum gelieferten Inhalt passen (z.B. 'text/html', 'image/jpeg'). GET: Parameter stehen in der URL als QUERY_STRING. POST: Daten stehen im wsgi.input-Stream, Länge steht in CONTENT_LENGTH. urllib.parse.parse_qs() für URL-Dekodierung der Query-Parameter. URL-Encoding: Leerzeichen werden zu +, Sonderzeichen zu %XX kodiert."
  },
  {
    id: 13,
    fr: "Programmation orientée objet",
    de: "Objektorientierung",
    lang: "python",
    hasCode: true,
    concepts: ["class", "__init__", "self", "Vererbung", "Überschreiben", "__str__", "super()", "property()", "Getter/Setter", "@staticmethod", "Mehrfachvererbung", "__del__", "öffentlich vs privat (__/_ )"],
    klausurRelevant: true,
    summary: "class Name: Klassendefinition. __init__(self): Konstruktor (kein Rückgabetyp, kein return-Wert!). self = Referenz auf die eigene Instanz (immer erster Parameter jeder Methode, wird beim Aufruf automatisch mitgegeben). Vererbung: class Kind(Eltern) — bei Mehrfachvererbung class Kind(Basis1, Basis2). Überschreiben: gleichnamige Methode in Unterklasse neu implementieren. super().__init__() ruft den Konstruktor der Elternklasse auf. __str__(self): definiert die String-Darstellung eines Objekts (wird von print()/str() genutzt). Python kennt kein echtes 'private': Konvention __name = privat (name mangling), _name = protected (nur Konvention, kein Zwang) — von außen werden Attribute daher meist über Getter/Setter-Methoden zugänglich gemacht, oft gekapselt mit property(getter, setter) als Klassenattribut, damit sie sich wie normale Attribute lesen/schreiben lassen (obj.Name = ... statt obj.setName(...)). @staticmethod: Methode ohne self/Instanzbezug, wird über Klassenname.Methode() aufgerufen. Mehrfachvererbung ist in Python erlaubt (anders als in Java)!"
  },
  {
    id: 14,
    fr: "Fonctions intégrées",
    de: "Built-In Functions",
    lang: "python",
    hasCode: true,
    concepts: ["map()", "filter()", "zip()", "lambda", "eval()", "exec()", "all()", "any()", "abs()", "divmod()", "max()", "min()", "pow()", "round()", "sum()", "bin()", "oct()", "chr()", "sorted()", "enumerate()", "isinstance()"],
    klausurRelevant: true,
    summary: "lambda params: ausdruck = anonyme Funktion (nur EIN Ausdruck, kein Block, kein return-Schlüsselwort!) — oft als key= oder als Bedingung z.B. in Kombination mit any()/map(). map(func, iterable): wendet func auf alle Elemente an → Iterator (mit list() sichtbar machen). filter(func, iterable): behält nur Elemente wo func(x) wahr ist → Iterator. zip(l1, l2): führt Sequenzen parallel elementweise zu Tupeln zusammen. all(iterable): True wenn ALLE Werte wahr sind (leere Sequenz → True!). any(iterable): True wenn MINDESTENS EIN Wert wahr ist. Mathematische Built-ins: abs(x)=Betrag, divmod(a,b)=(a//b, a%b) als Tupel, max()/min() auf iterable, pow(x,y[,z])=x^y (ggf. modulo z), round(x[,n])=runden (Achtung: Python rundet halbe Werte 'bankers rounding' — round(0.5)=0!), sum(iterable[,start])=Summe. bin()/oct()/chr(): Zahl in Binär-/Oktal-String bzw. Unicode-Zeichen umwandeln (Umkehrung: ord()). eval(string): Python-AUSDRUCK dynamisch auswerten und Ergebnis zurückgeben. exec(string): beliebigen Python-CODE (auch mehrzeilig, Anweisungen) dynamisch ausführen, ohne Rückgabewert."
  },
  {
    id: 15,
    fr: "Exemples pratiques",
    de: "Praxisbeispiele",
    lang: "python",
    hasCode: true,
    klausurRelevant: false,
    concepts: ["neuronale Netze", "TensorFlow", "Keras", "MNIST", "Web-Scraping", "requests", "BeautifulSoup", "RSS-Feed", "PDF herunterladen", "Bilderkennung"],
    summary: "Neuronale Netze: TensorFlow/Keras, MNIST-Datensatz (handgeschriebene Ziffern), Sequential-Modell, Dense-Layer, Aktivierungsfunktionen (relu, softmax). Web-Scraping: requests für HTTP-Anfragen, BeautifulSoup für HTML-Parsing. RSS-Feed parsen und BGH-Urteile automatisch als PDF herunterladen — Kombination: requests + Dateioperationen. Praxisprojekte sind Vertiefung, nicht Kernprüfungsstoff."
  },
  {
    id: 16,
    fr: "Perl — bases",
    de: "Weitere dynamische Sprachen — Perl",
    lang: "perl",
    hasCode: true,
    klausurRelevant: false,
    concepts: ["$skalare", "@arrays", "%hashes", "Sigil", "use strict", "use warnings", "chomp()", "print", "Kontrollstrukturen", "Stringoperatoren"],
    summary: "Perl: $variable=Skalar, @array=Liste, %hash=Dictionary. Sigile ($/@/%) kennzeichnen Variablentyp. use strict; use warnings; empfohlen. chomp() entfernt Zeilenende-Zeichen. print 'text'; für Ausgabe. Kontrollstrukturen ähnlich wie C/Java (mit {}). Strings: . für Verkettung (nicht +!). Verbreitet für Textverarbeitung, Systemadministration, Bioinformatik. Nur grobes Überblickswissen nötig, keine Detailfragen."
  },
  {
    id: 17,
    fr: "JavaScript — bases",
    de: "Weitere dynamische Sprachen — JavaScript",
    lang: "javascript",
    hasCode: true,
    klausurRelevant: false,
    concepts: ["var/let/const", "function", "Objekte", "Arrays", "typeof", "Kontrollstrukturen", "Prototypen", "Event-Handler", "DOM", "dynamische Typisierung"],
    summary: "JavaScript: var (function-scoped, veraltet), let/const (block-scoped, modern). Dynamische Typisierung wie Python. Objekte als Key-Value-Paare: {}. Arrays: []. Funktionen sind First-Class-Objects (können als Parameter übergeben werden). typeof-Operator. Kontrollstrukturen wie Java/C (mit {}). Läuft im Browser (DOM-Manipulation) und auf Server (Node.js). Prototypen-basierte Vererbung. Nur grobes Überblickswissen nötig, keine Detailfragen."
  },
]
