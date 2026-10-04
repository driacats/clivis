# Comune dei santi: estrazione dei testi

Rigenera `testi/comuni.json` dal PDF (pp. 203-299), dalla cartella `mlg-breviary`:

    python3 gabc/tools/comuni/1-estrai.py "sources/Lodi complete.2.pdf" /tmp/raw.json
    python3 gabc/tools/comuni/2-struttura.py /tmp/raw.json /tmp/comuni.json
    python3 gabc/tools/comuni/3-correzioni.py /tmp/comuni.json testi/comuni.json

Attenzione: il file in `testi/` contiene anche i campi `canto` (id delle melodie
trascritte) aggiunti dopo: rigenerandolo vanno ricollegati.
