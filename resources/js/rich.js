if (typeof kintRich === 'undefined') {
    kintRich = (function() {
        var kintRich = {
            doubleClickTimer: null,

            selectText: function(element) {
                var selection = window.getSelection(),
                    range = document.createRange();

                range.selectNodeContents(element);
                selection.removeAllRanges();
                selection.addRange(range);
            },

            each: function(selector, callback) {
                Array.prototype.slice.call(document.querySelectorAll(selector), 0).forEach(callback)
            },

            hasClass: function(target, className) {
                if (!target.classList) {
                    return false;
                }

                if (typeof className === 'undefined') {
                    className = 'kint-show';
                }
                return target.classList.contains(className);
            },

            addClass: function(target, className) {
                if (typeof className === 'undefined') {
                    className = 'kint-show';
                }
                target.classList.add(className);
            },

            removeClass: function(target, className) {
                if (typeof className === 'undefined') {
                    className = 'kint-show';
                }
                target.classList.remove(className);
                return target;
            },

            toggle: function(element, hide) {
                var parent = kintRich.getChildren(element);

                if (!parent) {
                    return;
                }

                if (typeof hide === 'undefined') {
                    hide = kintRich.hasClass(element);
                }

                if (hide) {
                    kintRich.removeClass(element);
                } else {
                    kintRich.addClass(element);
                }

                if (parent.childNodes.length === 1) {
                    parent = parent.childNodes[0].childNodes[0]; // reuse variable cause I can

                    // parent is checked in case of empty <pre> when array("\n") is dumped
                    if (parent && kintRich.hasClass(parent, 'kint-parent')) {
                        kintRich.toggle(parent, hide)
                    }
                }
            },

            toggleChildren: function(element, hide) {
                var parent = kintRich.getChildren(element);

                if (!parent) {
                    return;
                }

                var nodes = parent.getElementsByClassName('kint-parent');
                var i = nodes.length;

                if (typeof hide === 'undefined') {
                    hide = kintRich.hasClass(element);
                }

                while (i--) {
                    kintRich.toggle(nodes[i], hide);
                }
                kintRich.toggle(element, hide);
            },

            toggleAll: function(caret) {
                var elements = document.getElementsByClassName('kint-parent'),
                    i = elements.length,
                    visible = kintRich.hasClass(caret.parentNode);

                while (i--) {
                    kintRich.toggle(elements[i], visible);
                }
            },

            switchTab: function(target) {
                var lis, el = target,
                    index = 0;

                target.parentNode.getElementsByClassName('kint-active-tab')[0].className = '';
                target.className = 'kint-active-tab';

                // take the index of clicked title tab and make the same n-th content tab visible
                while (el = el.previousSibling) el.nodeType === 1 && index++;
                lis = target.parentNode.nextSibling.childNodes;
                for (var i = 0; i < lis.length; i++) {
                    if (i === index) {
                        lis[i].style.display = 'block';

                        if (lis[i].childNodes.length === 1) {
                            el = lis[i].childNodes[0].childNodes[0];

                            if (el && kintRich.hasClass(el, 'kint-parent')) {
                                kintRich.toggle(el, false)
                            }
                        }
                    } else {
                        lis[i].style.display = 'none';
                    }
                }
            },

            isChild: function(el) {
                for (;;) {
                    el = el.parentNode;
                    if (!el || kintRich.hasClass(el, 'kint')) {
                        break;
                    }
                }

                return !!el;
            },

            openInNewWindow: function(kintContainer) {
                var newWindow;

                if (newWindow = window.open()) {
                    newWindow.document.open();
                    newWindow.document.write(
                        '<html>' +
                        '<head>' +
                        '<title>Kint (' + new Date().toISOString() + ')</title>' +
                        '<meta charset="utf-8">' +
                        document.getElementsByClassName('-kint-js')[0].outerHTML +
                        document.getElementsByClassName('-kint-css')[0].outerHTML +
                        '</head>' +
                        '<body>' +
                        '<input style="width: 100%" placeholder="Take some notes!">' +
                        '<div class="kint">' +
                        kintContainer.parentNode.outerHTML +
                        '</div></body>'
                    );
                    newWindow.document.close();
                }
            },

            sortTable: function(table, column) {
                var tbody = table.tBodies[0];

                var format = function(s) {
                    var n = column === 1 ? s.replace(/^#/, '') : s;
                    if (isNaN(n)) {
                        return s.trim().toLocaleLowerCase();
                    } else {
                        n = parseFloat(n);
                        return isNaN(n) ? s.trim() : n;
                    }
                };

                [].slice.call(table.tBodies[0].rows)
                    .sort(function(a, b) {
                        a = format(a.cells[column].textContent);
                        b = format(b.cells[column].textContent);
                        if (a < b) {
                            return -1;
                        }
                        if (a > b) {
                            return 1;
                        }

                        return 0;
                    })
                    .forEach(function(el) {
                        tbody.appendChild(el);
                    });
            },

            showAccessPath: function(target) {
                var nodes = target.childNodes;

                for (var i = 0; i < nodes.length; i++) {
                    if (kintRich.hasClass(nodes[i], 'access-path')) {
                        if (kintRich.hasClass(nodes[i], 'kint-show')) {
                            kintRich.removeClass(nodes[i]);
                        } else {
                            kintRich.addClass(nodes[i]);
                            kintRich.selectText(nodes[i]);
                        }
                        return;
                    }
                }
            },

            getParentHeader: function(el, allowChildren) {
                var nodeName = el.nodeName.toLowerCase();

                while (nodeName !== 'dd' && nodeName !== 'dt' && kintRich.isChild(el)) {
                    el = el.parentNode;
                    nodeName = el.nodeName.toLowerCase();
                }

                if (!kintRich.isChild(el)) {
                    return null;
                }

                if (nodeName === 'dd' && allowChildren) {
                    el = el.previousElementSibling;
                }

                if (el && el.nodeName.toLowerCase() === 'dt' && kintRich.hasClass(el, 'kint-parent')) {
                    return el;
                }
            },

            getChildren: function(element) {
                do {
                    element = element.nextElementSibling;
                } while (element && element.nodeName.toLowerCase() !== 'dd');
                return element;
            },

            keyboardNav: {
                targets: [], // all visible toggle carets
                target: 0, // currently selected caret
                active: false,

                fetchTargets: function() {
                    kintRich.keyboardNav.targets = [];
                    kintRich.each('.kint nav, .kint-tabs>li:not(.kint-active-tab)', function(el) {
                        if (el.offsetWidth !== 0 || el.offsetHeight !== 0) {
                            kintRich.keyboardNav.targets.push(el)
                        }
                    });
                },

                sync: function(noscroll) {
                    var prevElement = document.querySelector('.kint-focused');
                    if (prevElement) {
                        kintRich.removeClass(prevElement, 'kint-focused');
                    }

                    if (kintRich.keyboardNav.active) {
                        var el = kintRich.keyboardNav.targets[kintRich.keyboardNav.target];
                        kintRich.addClass(el, 'kint-focused');

                        if (!noscroll) {
                            kintRich.keyboardNav.scroll(el);
                        }
                    }
                },

                scroll: function(el) {
                    var offsetTop = function(el) {
                        return el.offsetTop + (el.offsetParent ? offsetTop(el.offsetParent) : 0);
                    }

                    var top = offsetTop(el) - window.innerHeight / 2;
                    window.scrollTo(0, top);
                },

                moveCursor: function(diff) {
                    kintRich.keyboardNav.target += diff;

                    while (kintRich.keyboardNav.target < 0) {
                        kintRich.keyboardNav.target += kintRich.keyboardNav.targets.length;
                    }
                    while (kintRich.keyboardNav.target >= kintRich.keyboardNav.targets.length) {
                        kintRich.keyboardNav.target -= kintRich.keyboardNav.targets.length;
                    }

                    kintRich.keyboardNav.sync();
                },

                setCursor: function(elem) {
                    kintRich.keyboardNav.fetchTargets();

                    for (var i = 0; i < kintRich.keyboardNav.targets.length; i++) {
                        if (elem === kintRich.keyboardNav.targets[i]) {
                            kintRich.keyboardNav.target = i;
                            return true;
                        }
                    }

                    return false;
                },
            },
        };

        window.addEventListener('click', function(e) {
            var target = e.target,
                nodeName = target.nodeName.toLowerCase();

            if (!kintRich.isChild(target)) {
                return;
            }

            // auto-select name of variable
            if (nodeName === 'dfn') {
                kintRich.selectText(target);
            } else if (kintRich.hasClass(target, 'access-path')) {
                kintRich.selectText(target);
            } else if (nodeName === 'th') {
                if (!e.ctrlKey) {
                    kintRich.sortTable(target.parentNode.parentNode.parentNode, target.cellIndex)
                }
                return false;
            }

            // Ensure the header at least is selected
            target = kintRich.getParentHeader(target);
            if (target) {
                kintRich.keyboardNav.setCursor(target.querySelector('nav'));
                kintRich.keyboardNav.sync(true);
            }

            target = e.target;

            // switch tabs
            if (nodeName === 'li' && target.parentNode.className === 'kint-tabs') {
                if (target.className !== 'kint-active-tab') {
                    kintRich.switchTab(target);
                }
                target = kintRich.getParentHeader(target, true);
                if (target) {
                    kintRich.keyboardNav.setCursor(target.querySelector('nav'));
                    kintRich.keyboardNav.sync(true);
                }
                return false;
            } else if (nodeName === 'nav') {
                // handle clicks on the navigation caret
                if (target.parentNode.nodeName.toLowerCase() === 'footer') {
                    kintRich.keyboardNav.setCursor(target);
                    kintRich.keyboardNav.sync(true);
                    target = target.parentNode;
                    if (kintRich.hasClass(target)) {
                        kintRich.removeClass(target)
                    } else {
                        kintRich.addClass(target)
                    }
                } else {
                    // ensure doubleclick has different behaviour, see below
                    window.clearTimeout(kintRich.doubleClickTimer);
                    kintRich.doubleClickTimer = window.setTimeout(function() {
                        kintRich.toggleChildren(target.parentNode);
                        kintRich.keyboardNav.fetchTargets();
                    }, 300);
                }

                return false;
            } else if (kintRich.hasClass(target, 'kint-ide-link')) {
                var ajax = new XMLHttpRequest(); // add ajax call to contact editor but prevent link default action
                ajax.open('GET', target.href);
                ajax.send(null);
                return false;
            } else if (kintRich.hasClass(target, 'kint-popup-trigger')) {
                var kintContainer = target.parentNode;
                if (kintContainer.nodeName.toLowerCase() === 'footer') {
                    kintContainer = kintContainer.previousSibling;
                } else {
                    while (kintContainer && !kintRich.hasClass(kintContainer, 'kint-parent')) {
                        kintContainer = kintContainer.parentNode;
                    }
                }

                kintRich.openInNewWindow(kintContainer);
            } else if (kintRich.hasClass(target, 'kint-access-path-trigger')) {
                kintRich.showAccessPath(target.parentNode);
                return false;
            } else if (nodeName === 'pre' && e.detail === 3) { // triple click pre to select it all
                kintRich.selectText(target);
            } else {
                target = kintRich.getParentHeader(target);
                if (target) {
                    kintRich.toggle(target);
                    kintRich.keyboardNav.fetchTargets();
                }
                return false;
            }
        }, false);

        window.addEventListener('dblclick', function(e) {
            var target = e.target;
            if (!kintRich.isChild(target)) {
                return;
            }

            if (target.nodeName.toLowerCase() === 'nav' && target.parentNode.nodeName.toLowerCase() !== 'footer') {
                window.clearTimeout(kintRich.doubleClickTimer);
                kintRich.doubleClickTimer = null;

                kintRich.toggleAll(target);
                kintRich.keyboardNav.setCursor(target);
                kintRich.keyboardNav.sync(true);
                kintRich.keyboardNav.scroll(target);

                return false;
            }
        }, false);

        // keyboard navigation
        window.onkeydown = function(e) { // direct assignment is used to have priority over ex FAYT
            // do nothing if alt/ctrl key is pressed or if we're actually typing somewhere
            if (e.target !== document.body || e.altKey || e.ctrlKey) {
                return;
            }

            if (e.keyCode === 68) { // 'd' : toggles navigation on/off
                if (kintRich.keyboardNav.active) {
                    kintRich.keyboardNav.active = false;
                } else {
                    kintRich.keyboardNav.active = true;
                    kintRich.keyboardNav.fetchTargets();

                    if (kintRich.keyboardNav.targets.length === 0) {
                        kintRich.keyboardNav.active = false;
                        return true;
                    }
                }

                kintRich.keyboardNav.sync();
                return false;
            } else if (!kintRich.keyboardNav.active) {
                return true;
            } else if (e.keyCode === 9) {
                // TAB : moves up/down depending on shift key
                kintRich.keyboardNav.moveCursor(e.shiftKey ? -1 : 1);
                return false;
            } else if (e.keyCode === 38) {
                // ARROW UP : moves up
                kintRich.keyboardNav.moveCursor(-1);
                return false;
            } else if (e.keyCode === 40) {
                // ARROW DOWN : down
                kintRich.keyboardNav.moveCursor(1);
                return false;
            }

            var kintNode = kintRich.keyboardNav.targets[kintRich.keyboardNav.target];
            if (kintNode.nodeName.toLowerCase() === 'li') {
                // we're on a trace tab
                if (e.keyCode === 32 || e.keyCode === 13) {
                    // SPACE/ENTER
                    kintRich.switchTab(kintNode);
                    kintRich.keyboardNav.fetchTargets();
                    kintRich.keyboardNav.sync();
                    return false;
                } else if (e.keyCode === 39) {
                    // arrows
                    kintRich.keyboardNav.moveCursor(1);
                    return false;
                } else if (e.keyCode === 37) {
                    kintRich.keyboardNav.moveCursor(-1);
                    return false;
                }
            }

            // simple dump
            kintNode = kintNode.parentNode;

            // 'a' : toggles access path on/off
            if (e.keyCode === 65) {
                kintRich.showAccessPath(kintNode);
                return false;
            } else if (kintNode.nodeName.toLowerCase() === 'footer' && kintRich.hasClass(kintNode.parentNode, 'kint')) {
                // Minitrace needs special class handling
                if (e.keyCode === 32 || e.keyCode === 13) {
                    if (kintRich.hasClass(kintNode)) {
                        kintRich.removeClass(kintNode);
                    } else {
                        kintRich.addClass(kintNode);
                    }
                } else if (e.keyCode === 37) {
                    kintRich.removeClass(kintNode);
                } else if (e.keyCode === 39) {
                    kintRich.addClass(kintNode);
                } else {
                    return true;
                }

                return false;
            } else if (e.keyCode === 32 || e.keyCode === 13) {
                // SPACE/ENTER : toggles
                kintRich.toggle(kintNode);
                kintRich.keyboardNav.fetchTargets();
                return false;
            } else if (e.keyCode === 39 || e.keyCode === 37) {
                // ARROW LEFT/RIGHT : respectively hides/shows and traverses
                var hide = e.keyCode === 37;

                // expand/collapse all children if immediate ones are showing
                if (kintRich.hasClass(kintNode)) {
                    kintRich.toggleChildren(kintNode, hide);
                } else {
                    // traverse to parent and THEN hide
                    if (hide) {
                        var parent = kintRich.getParentHeader(kintNode.parentNode.parentNode, true);

                        if (parent) {
                            kintNode = parent;
                            kintRich.keyboardNav.setCursor(kintNode.querySelector('nav'));
                            kintRich.keyboardNav.sync();
                        }
                    }

                    kintRich.toggle(kintNode, hide);
                }

                kintRich.keyboardNav.fetchTargets();
                return false;
            }
        };

        return kintRich;
    })();
}
