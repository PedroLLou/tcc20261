#!/usr/bin/env python3
"""Validate the real Blueprint against Render's current public schema."""
import json
from pathlib import Path
import sys
from urllib.request import urlopen

import jsonschema
import yaml

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / 'render.yaml'
try:
    blueprint = yaml.safe_load(path.read_text())
    with urlopen('https://render.com/schema/render.yaml.json', timeout=30) as response:
        schema = json.load(response)
    jsonschema.validate(blueprint, schema)
    if blueprint.get('databases') or blueprint.get('envVarGroups'):
        raise ValueError('unexpected resource')
    for service in blueprint['services']:
        if service['type'] != 'web' or service.get('disk'):
            raise ValueError('unexpected compute or disk')
        if service['runtime'] == 'static':
            if 'plan' in service:
                raise ValueError('static compute plan')
        elif service.get('plan') != 'free':
            raise ValueError('paid compute')
        if service.get('autoDeployTrigger') != 'off':
            raise ValueError('migration sequencing requires manual deploy')
    print('Blueprint válido no esquema oficial; serviços gratuitos, sem disco ou banco provisionado, com deploy manual.')
except Exception:
    # Erros de validação podem incluir valores do documento. Não imprimi-los.
    print('Blueprint inválido ou esquema indisponível. Confira campos, plano gratuito e deploy manual.', file=sys.stderr)
    sys.exit(1)
