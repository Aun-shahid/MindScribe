from django.core.exceptions import ValidationError


class MaxFileSizeValidator:
    """Limit upload size (bytes)."""

    def __init__(self, max_bytes: int):
        self.max_bytes = max_bytes

    def __call__(self, value):
        if value.size > self.max_bytes:
            mb = self.max_bytes / (1024 * 1024)
            raise ValidationError(f'File must be {mb:.0f} MB or smaller.')

    def __eq__(self, other):
        return isinstance(other, MaxFileSizeValidator) and self.max_bytes == other.max_bytes

    def deconstruct(self):
        return (
            f'{self.__class__.__module__}.{self.__class__.__name__}',
            (self.max_bytes,),
            {},
        )
