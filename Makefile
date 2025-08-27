.PHONY: install-backend install-frontend backend frontend clean re

install-backend:
    @echo "Installing Python dependencies..."
    @if [ ! -d "venv" ]; then \
        echo "Creating virtual environment..."; \
        python3 -m venv venv; \
    fi
    venv/bin/pip install --upgrade pip
    venv/bin/pip install -r requirements.txt

install-frontend:
    @echo "Installing Frontend dependencies..."
    cd frontend && npm install

backend:
    cd crypto-app && ../venv/bin/python3 app.py

frontend:
	cd frontend && npm start

killport:
	-fuser -k 5000/tcp || true
	-fuser -k 3000/tcp || true

clean: killport
	rm -f backend/Cointest.db
	rm -f *.csv
	rm -f backend/*.csv
	rm -f frontend/*.csv

fclean: clean
    rm -rf venv
    rm -rf frontend/node_modules
