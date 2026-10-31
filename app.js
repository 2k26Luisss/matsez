(function () {
    'use strict';

    // ---------- Utilidades ----------
    function num(v) {
        if (v === undefined || v === null) return NaN;
        var s = String(v).trim();
        if (s === '') return NaN;
        return Number(s);
    }

    function nf(n, d) {
        if (!Number.isFinite(n)) return '—';
        var max = d === undefined ? 2 : d;
        return n.toLocaleString('es-CO', { maximumFractionDigits: max });
    }

    function money(n, d) {
        return '$ ' + nf(n, d === undefined ? 2 : d);
    }

    function err(msg) { return { error: msg }; }

    // ---------- Cálculos (funciones puras, sin DOM) ----------
    var Calc = {};

    Calc.porcentajes = function (v) {
        var a = num(v.a), b = num(v.b), mode = v.mode || 'of';
        if (!Number.isFinite(a) || !Number.isFinite(b)) return err('Escribe los dos valores para calcular.');
        var rows = [];
        if (mode === 'of') {
            rows.push([a + '% de ' + nf(b, 6), nf(a * b / 100, 6), true]);
        } else if (mode === 'what') {
            if (b === 0) return err('El valor B no puede ser cero.');
            rows.push([nf(a, 6) + ' es el … % de ' + nf(b, 6), nf(a / b * 100, 4) + ' %', true]);
        } else if (mode === 'change') {
            if (a === 0) return err('El valor inicial (A) no puede ser cero.');
            var c = (b - a) / Math.abs(a) * 100;
            rows.push(['Variación de ' + nf(a, 6) + ' a ' + nf(b, 6), nf(c, 4) + ' %', true]);
            rows.push(['Tipo', c > 0 ? 'Aumento' : (c < 0 ? 'Disminución' : 'Sin cambio')]);
        } else if (mode === 'add') {
            rows.push([nf(b, 6) + ' aumentado en ' + a + '%', nf(b * (1 + a / 100), 6), true]);
            rows.push(['Valor del aumento', nf(b * a / 100, 6)]);
        } else if (mode === 'sub') {
            rows.push([nf(b, 6) + ' disminuido en ' + a + '%', nf(b * (1 - a / 100), 6), true]);
            rows.push(['Valor del descuento', nf(b * a / 100, 6)]);
        } else {
            return err('Opción no válida.');
        }
        return { rows: rows };
    };

    Calc.iva = function (v) {
        var amount = num(v.monto), rate = num(v.tarifa);
        if (!Number.isFinite(amount) || amount < 0) return err('Escribe un valor válido (mayor o igual a 0).');
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) return err('La tarifa debe estar entre 0 y 100.');
        var base, iva, total;
        if (v.modo === 'quitar') {
            total = amount;
            base = total / (1 + rate / 100);
            iva = total - base;
        } else {
            base = amount;
            iva = base * rate / 100;
            total = base + iva;
        }
        return { rows: [
            ['Valor sin IVA (base)', money(base), false],
            ['IVA (' + nf(rate, 2) + ' %)', money(iva), false],
            ['Total con IVA', money(total), true]
        ] };
    };

    Calc.propinas = function (v) {
        var bill = num(v.cuenta), pct = num(v.pct), people = v.personas === '' || v.personas === undefined ? 1 : num(v.personas);
        if (!Number.isFinite(bill) || bill < 0) return err('Escribe el valor de la cuenta.');
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) return err('El porcentaje de propina debe estar entre 0 y 100.');
        if (!Number.isInteger(people) || people < 1 || people > 100) return err('El número de personas debe ser un entero entre 1 y 100.');
        var tip = bill * pct / 100, total = bill + tip;
        return { rows: [
            ['Propina', money(tip), false],
            ['Total a pagar', money(total), true],
            ['Por persona (' + people + ')', money(total / people), false]
        ] };
    };

    Calc.temperatura = function (v) {
        var x = num(v.valor), from = v.de, to = v.a;
        if (!Number.isFinite(x)) return err('Escribe un valor numérico.');
        var min = { C: -273.15, F: -459.67, K: 0 };
        if (!(from in min) || !(to in min)) return err('Unidad no válida.');
        if (x < min[from]) return err('Ese valor está por debajo del cero absoluto.');
        var c = from === 'C' ? x : (from === 'F' ? (x - 32) * 5 / 9 : x - 273.15);
        var r = to === 'C' ? c : (to === 'F' ? c * 9 / 5 + 32 : c + 273.15);
        var sym = { C: '°C', F: '°F', K: ' K' };
        return { rows: [[nf(x, 4) + sym[from] + ' equivale a', nf(r, 2) + sym[to], true]] };
    };

    var UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    var BIN = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

    Calc.datos = function (v) {
        var x = num(v.valor), i = UNITS.indexOf(v.de), j = UNITS.indexOf(v.a);
        var binary = v.estandar === 'binario';
        if (!Number.isFinite(x) || x < 0) return err('Escribe un valor válido (mayor o igual a 0).');
        if (i < 0 || j < 0) return err('Unidad no válida.');
        var base = binary ? 1024 : 1000, names = binary ? BIN : UNITS;
        var bytes = x * Math.pow(base, i);
        var result = bytes / Math.pow(base, j);
        var rows = [[nf(x, 6) + ' ' + names[i] + ' equivale a', nf(result, 6) + ' ' + names[j], true],
                    ['En bytes', nf(bytes, 0) + ' B', false]];
        return { rows: rows };
    };

    var SETS = {
        lower: 'abcdefghijklmnopqrstuvwxyz',
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        digits: '0123456789',
        symbols: '!@#$%&*?-_+='
    };

    function randInt(max, c) {
        var limit = Math.floor(0x100000000 / max) * max;
        var buf = new Uint32Array(1);
        do { c.getRandomValues(buf); } while (buf[0] >= limit);
        return buf[0] % max;
    }

    Calc.claves = function (v, cryptoObj) {
        var c = cryptoObj || (typeof globalThis !== 'undefined' ? globalThis.crypto : null);
        if (!c || typeof c.getRandomValues !== 'function') return err('Tu navegador no admite generación segura de números aleatorios.');
        var len = num(v.longitud);
        if (!Number.isInteger(len) || len < 8 || len > 64) return err('La longitud debe ser un número entero entre 8 y 64.');
        var active = ['lower', 'upper', 'digits', 'symbols'].filter(function (k) { return v[k] === true || v[k] === 'on'; });
        if (active.length === 0) return err('Marca al menos un tipo de carácter.');
        var pool = active.map(function (k) { return SETS[k]; }).join('');
        var out = active.map(function (k) { return SETS[k][randInt(SETS[k].length, c)]; });
        while (out.length < len) out.push(pool[randInt(pool.length, c)]);
        for (var i = out.length - 1; i > 0; i--) {
            var j = randInt(i + 1, c), t = out[i];
            out[i] = out[j]; out[j] = t;
        }
        var bits = len * Math.log2(pool.length);
        var level = bits < 40 ? 'Débil' : bits < 60 ? 'Media' : bits < 80 ? 'Fuerte' : 'Muy fuerte';
        return {
            password: out.join(''),
            rows: [['Fortaleza estimada', level + ' (≈ ' + nf(bits, 0) + ' bits)', false]],
            extra: 'Se generó en tu dispositivo y no se envía a ningún servidor. Guárdala en un gestor de contraseñas.'
        };
    };

    Calc.imc = function (v) {
        var kg = num(v.peso), cm = num(v.altura);
        if (!Number.isFinite(kg) || kg < 2 || kg > 500) return err('El peso debe estar entre 2 y 500 kg.');
        if (!Number.isFinite(cm) || cm < 50 || cm > 250) return err('La estatura debe estar entre 50 y 250 cm.');
        var m = cm / 100, imc = kg / (m * m), cat;
        if (imc < 18.5) cat = 'Bajo peso';
        else if (imc < 25) cat = 'Peso normal';
        else if (imc < 30) cat = 'Sobrepeso';
        else if (imc < 35) cat = 'Obesidad grado I';
        else if (imc < 40) cat = 'Obesidad grado II';
        else cat = 'Obesidad grado III';
        return {
            rows: [
                ['Tu IMC', nf(imc, 1), true],
                ['Clasificación (OMS, adultos)', cat, false],
                ['Rango de peso con IMC 18,5 – 24,9', nf(18.5 * m * m, 1) + ' – ' + nf(24.9 * m * m, 1) + ' kg', false]
            ],
            extra: 'El IMC es una referencia general para adultos y no un diagnóstico. Consulta a un profesional de la salud.'
        };
    };

    Calc.prestamo = function (v) {
        var p = num(v.monto), rate = num(v.tasa), n = num(v.plazo);
        if (!Number.isFinite(p) || p <= 0) return err('Escribe un monto mayor a 0.');
        if (!Number.isFinite(rate) || rate < 0 || rate > 200) return err('La tasa debe estar entre 0 y 200 %.');
        if (!Number.isInteger(n) || n < 1 || n > 600) return err('El plazo debe ser un número entero de meses entre 1 y 600.');
        var i = v.tipo === 'mensual' ? rate / 100 : Math.pow(1 + rate / 100, 1 / 12) - 1;
        var cuota = i === 0 ? p / n : p * i / (1 - Math.pow(1 + i, -n));
        var total = cuota * n;
        return { rows: [
            ['Cuota mensual', money(cuota, 0), true],
            ['Total a pagar', money(total, 0), false],
            ['Total de intereses', money(total - p, 0), false],
            ['Tasa mensual equivalente', nf(i * 100, 4) + ' %', false]
        ], extra: 'No incluye seguros, cuotas de manejo ni otros costos que cobre la entidad financiera.' };
    };

    Calc.cesantias = function (v) {
        var s = num(v.salario), d = num(v.dias), tipo = v.tipo || 'cesantias';
        if (!Number.isFinite(s) || s <= 0) return err('Escribe el salario base mensual.');
        var maxDias = tipo === 'prima' ? 180 : 360;
        if (!Number.isInteger(d) || d < 1 || d > maxDias) return err('Los días deben ser un número entero entre 1 y ' + maxDias + '.');
        if (tipo === 'prima') {
            return { rows: [['Prima de servicios', money(s * d / 360, 0), true]],
                extra: 'Fórmula: salario base × días del semestre ÷ 360. Valor aproximado; confirma con tu empleador.' };
        }
        var ces = s * d / 360, int = ces * d * 0.12 / 360;
        return { rows: [
            ['Cesantías', money(ces, 0), true],
            ['Intereses sobre cesantías (12 % anual)', money(int, 0), false],
            ['Total', money(ces + int, 0), false]
        ], extra: 'Valores aproximados. Si tu salario es variable, usa el promedio del último año.' };
    };

    // ---------- Exportar para pruebas en Node ----------
    if (typeof module !== 'undefined' && module.exports) { module.exports = Calc; }
    if (typeof document === 'undefined') return;

    // ---------- Interfaz ----------
    function render(out, r) {
        while (out.firstChild) out.removeChild(out.firstChild);
        out.classList.remove('error');
        if (r.error) {
            out.classList.add('error');
            out.textContent = r.error;
            return;
        }
        if (r.password) {
            var pw = document.createElement('p');
            pw.className = 'mono';
            pw.textContent = r.password;
            out.appendChild(pw);
        }
        var dl = document.createElement('dl');
        r.rows.forEach(function (row) {
            var dt = document.createElement('dt');
            dt.textContent = row[0];
            var dd = document.createElement('dd');
            dd.textContent = row[1];
            if (row[2]) dd.className = 'big';
            dl.appendChild(dt);
            dl.appendChild(dd);
        });
        out.appendChild(dl);
        if (r.password) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn secondary';
            btn.textContent = 'Copiar clave';
            btn.addEventListener('click', function () {
                try {
                    navigator.clipboard.writeText(r.password).then(function () {
                        btn.textContent = 'Copiada';
                    }, function () { btn.textContent = 'No se pudo copiar'; });
                } catch (e) { btn.textContent = 'No se pudo copiar'; }
            });
            out.appendChild(btn);
        }
        if (r.extra) {
            var p = document.createElement('p');
            p.className = 'extra';
            p.textContent = r.extra;
            out.appendChild(p);
        }
    }

    function initForms() {
        var forms = document.querySelectorAll('form[data-tool]');
        for (var i = 0; i < forms.length; i++) {
            (function (form) {
                var fn = Calc[form.getAttribute('data-tool')];
                var out = form.querySelector('.result');
                if (!fn || !out) return;
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    var data = {};
                    Array.prototype.forEach.call(form.elements, function (el) {
                        if (!el.name) return;
                        data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
                    });
                    render(out, fn(data));
                });
            })(forms[i]);
        }
    }

    function initCookieNotice() {
        var KEY = 'uf_aviso_cookies';
        try { if (localStorage.getItem(KEY)) return; } catch (e) { /* sin almacenamiento */ }
        var box = document.createElement('div');
        box.className = 'cookie-banner';
        box.setAttribute('role', 'region');
        box.setAttribute('aria-label', 'Aviso de cookies');
        var p = document.createElement('p');
        p.appendChild(document.createTextNode('Este sitio usa cookies de terceros (Google) para mostrar anuncios. Más información en nuestra '));
        var a = document.createElement('a');
        var self = document.querySelector('script[src$="app.js"]');
        a.href = self ? new URL('privacidad/', self.src).href : 'privacidad/';
        a.textContent = 'política de privacidad';
        p.appendChild(a);
        p.appendChild(document.createTextNode('.'));
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Entendido';
        b.addEventListener('click', function () {
            try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignorar */ }
            box.remove();
        });
        box.appendChild(p);
        box.appendChild(b);
        document.body.appendChild(box);
    }

    function initAds() {
        // Se activa solo cuando reemplazas el ID de ejemplo en la etiqueta <meta name="google-adsense-account">.
        var meta = document.querySelector('meta[name="google-adsense-account"]');
        var id = meta ? meta.getAttribute('content') : '';
        if (!/^ca-pub-\d{10,20}$/.test(id)) return;
        var s = document.createElement('script');
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(id);
        document.head.appendChild(s);
    }

    document.addEventListener('DOMContentLoaded', function () {
        initForms();
        initCookieNotice();
        initAds();
    });
})();
