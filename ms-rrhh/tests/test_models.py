import pytest
from ms_rrhh.app import models


def test_model_definitions():
    # basic import smoke test to ensure models are defined
    assert hasattr(models, 'Employee')
    assert hasattr(models, 'Shift')
    assert hasattr(models, 'ShiftAssignment')
