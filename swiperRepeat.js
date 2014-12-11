/*! https://github.com/ibtkvi/swiper-repeat */
(function(angular, window, document, undefined) {'use strict';

var Api = function() {

  return {

    applyChanges: function(changes) {
      if(changes.hasOwnProperty('collection')) {
        this.updateCollection(changes.collection);
      }

      if(!this.isDragging()) {
        if(changes.hasOwnProperty('selected')) {
          var item = changes.selected,
              slidePosition = this.getSlidePosition(changes.selected);;

          if(Math.abs(slidePosition) > 0 || (slidePosition === 0 && this.isInTransition())) {
            this.transition(slidePosition, function() {
              this.select(item);
            });
          }

          else if(slidePosition === null) {
            this.select(item);
          }

          else if(slidePosition === 0 && changes.hasOwnProperty('collection') && !this.isInTransition()) {
            this.refresh();
          }
        }
        else if(changes.hasOwnProperty('collection') && !this.isInTransition()) {
          this.refresh();
        }
      }
    }

  }

};

var Container = function(element) {

  return {
    
    translateContainer: function(dx, duration) {
      element.css(this.TRANSITION_PROP + 'Duration', duration)
             .css(this.TRANSFORM_PROP, this.TRANSFORMS_3D ? 'translate3d(' + dx + ', 0, 0)' : 'translate(' + dx + ', 0)');
    },

    getContainerPosition: function() {
      var style = window.getComputedStyle(element[0], null);

      if(window.WebKitCSSMatrix) {
        var matrix = new WebKitCSSMatrix(style.webkitTransform === 'none' ? '' : style.webkitTransform);
        return matrix.m41;
      }
      
      var matrix = style[this.TRANSFORM_PROP].split(',');
      return +(matrix[12] || matrix[4]);
    },

    getContainerWidth: function() {
      return element[0].getBoundingClientRect().width || element.prop('offsetWidth');
    }

  }

};

var Polyfill = function() {

  var TRANSITION_PROP, TRANSITIONEND_EVENT;

  if (window.ontransitionend === undefined && window.onwebkittransitionend !== undefined) {
    TRANSITION_PROP = 'WebkitTransition';
    TRANSITIONEND_EVENT = 'webkitTransitionEnd transitionend';
  } else {
    TRANSITION_PROP = 'transition';
    TRANSITIONEND_EVENT = 'transitionend';
  }
  
  function getFirstAvailable(keys) {
    for (var i = 0; i < keys.length; i++) {
      if(document.documentElement.style[keys[i]] !== undefined) {
        return keys[i];
      }
    }
  }

  return {

    TRANSITION_PROP: TRANSITION_PROP,
    TRANSITIONEND_EVENT: TRANSITIONEND_EVENT,
    TRANSFORM_PROP: getFirstAvailable(['transform', 'webkitTransform', 'MozTransform', 'msTransform', 'OTransform']),
    TRANSFORMS_3D: !!getFirstAvailable(['perspective', 'webkitPerspective', 'MozPerspective',  'MsPerspective', 'OPerspective'])

  }

};

var Renderer = function(retranslatorFn) {

  var onTransitionEnd, isInTransition;

  return {

    select: function(item, offset) {
      this.render(this.resolve(item));
      this.move(offset || 0);
    },

    refresh: function(offset) {
      this.render(this.resolve());
      this.move(offset || 0);
    },

    move: function(offset) {
      this.translate(offset, 0);
    },

    transition: function(offset, callback) {
      this.translate(offset, 250, callback);
    },

    isInTransition: function() {
      return isInTransition;
    },

    translate: function(offset, duration, callback) {
      if(duration > 0) {
        onTransitionEnd = callback;
        isInTransition = true;
      } else {
        onTransitionEnd = null;
        isInTransition = false;
      }
      this.translateSlides(offset, duration);
      retranslatorFn && retranslatorFn(this.index, offset, duration);
    },

    onTransitionEnd: function() {
      isInTransition = false;
      onTransitionEnd && onTransitionEnd.call(this);
      onTransitionEnd = null;
    }

  }

};

var RendererFull = function(slideFactory) {

  var renderedSlides = [];

  return {

    render: function(collectionWasUpdated) {

      if(collectionWasUpdated) {

        for (var i = renderedSlides.length - 1; i >= 0; i--) {
          var slide = renderedSlides[i];
          if(this.collection.indexOf(slide.item) === -1) {
            slide.destroy();
            renderedSlides.splice(i, 1);
          }
        };

        for (var i = 0; i < this.collection.length; i++) {
          var slide = null,
              item = this.collection[i];

          for (var i2 = renderedSlides.length - 1; i2 >= 0; i2--) {
            if(renderedSlides[i2].item === item) {
              slide = renderedSlides[i2];
            }
          }

          if(!slide) {
            slide = slideFactory(item);
            slide.element.css({position: 'absolute', width: '100%', height: '100%'});
            renderedSlides.push(slide);
          }

          slide.element.css(this.TRANSFORM_PROP, 'translate(' + i * 100 + '%' + ', 0)');
        };
      }
    },

    translateSlides: function(offset, duration) {
      this.translateContainer((-offset -this.index) * 100 + '%', duration + 'ms');
    },

    getSlidesPosition: function() {
      return (-this.getContainerPosition() / this.getContainerWidth()) - this.index;
    },

    getSlidePosition: function(item) {
      if(this.index === null) return null;

      var index = this.collection.indexOf(item);
      return index === -1 ? null : index - this.index;
    }

  }

};

var RendererPart = function(slideFactory) {

  var renderedSlides = [];

  return {

    render: function() {
      for (var i = renderedSlides.length - 1; i >= 0; i--) {
        if(this.getSlidePosition(renderedSlides[i].item) === null) {
          renderedSlides[i].destroy();
          renderedSlides.splice(i, 1);
        }
      };

      this.slides.left && updateSlide.call(this, -1, this.slides.left.item);
      this.slides.center && updateSlide.call(this, 0, this.slides.center.item);
      this.slides.right && updateSlide.call(this, 1, this.slides.right.item);

      function updateSlide(position, item) {
        var slide;

        for (var i = renderedSlides.length - 1; i >= 0; i--) {
          if(renderedSlides[i].item === item) {
            slide = renderedSlides[i];
          }
        };
        
        if(!slide) {
          slide = slideFactory(item);
          slide.element.css({position: 'absolute', width: '100%', height: '100%'});
          renderedSlides.push(slide);
        }

        slide.element.css(this.TRANSFORM_PROP, 'translate(' + position * 100 + '%' + ', 0)');
      }
    },

    translateSlides: function(offset, duration) {
      this.translateContainer(-offset * 100 + '%', duration + 'ms');
    },

    getSlidePosition: function(item) {
      return this.slides.left && this.slides.left.item === item ? -1
           : this.slides.center && this.slides.center.item === item ? 0
           : this.slides.right && this.slides.right.item === item ? 1
           : null;
    },

    getSlidesPosition: function() {
      return -this.getContainerPosition() / this.getContainerWidth();
    }

  }

};

var State = function(selectedSetterFn) {

  var pendingCollection = null;

  return {

    slides: {
      left: null,
      center: null,
      right: null
    },

    collection: [],

    resolve: function(item) {
      var collectionWasUpdated = false;
      
      if(pendingCollection) {
        this.collection = [];
        for (var i = 0, ii = pendingCollection.length; i < ii; i++) {
          this.collection[i] = pendingCollection[i];
        }
        pendingCollection = null;
        collectionWasUpdated = true;
      }

      var slides = this.slides,
          collection = this.collection;

      if(arguments.length) {
        slides.center = { item: item };
      }
      else if(!slides.center && collection.length) {
        slides.center = { item: collection[0] };
      }

      if(slides.center && collection.indexOf(slides.center.item) === -1) {
        slides.center = collection.length ? { item: collection[0] } : null;
      }

      if(slides.center) {
        var index = this.index = collection.indexOf(slides.center.item);
        slides.left = index > 0 ? { item: collection[index - 1] } : null;
        slides.right = collection.length > index + 1 ? { item: collection[index + 1] } : null;
      } else {
        slides.left = slides.right = null;
        this.index = null;
      }

      slides.center && selectedSetterFn && selectedSetterFn(slides.center.item);

      return collectionWasUpdated;
    },

    updateCollection: function(collection) {
      pendingCollection = collection;
    }

  }

};
var Touch = function() {

  var initialOffset, 
      touchStart, 
      touchDelta,
      isScrolling,
      isDragging = false,
      containerWidth;

  return {
    
    onTouchStart: function(event) {
      initialOffset = 0,
      isDragging = true,
      isScrolling = undefined,
      containerWidth = this.getContainerWidth();

      if(this.isInTransition()) {
        initialOffset = this.getSlidesPosition();

        var item;
        if(initialOffset < -0.5) {
          item = this.slides.left.item;
          initialOffset = initialOffset + 1;
        }
        else if(initialOffset > 0.5) {
          item = this.slides.right.item;
          initialOffset = initialOffset - 1;
        }
        else {
          item = this.slides.center.item;
        }
        
        this.select(item, initialOffset);

        isScrolling = false;
      }
      
      var touch = event.touches[0];

      touchStart = {
        x: touch.pageX,
        y: touch.pageY,
        time: event.timeStamp || +new Date()
      };

      touchDelta = {
        x: 0,
        y: 0
      };
    },

    onTouchMove: function(event) {
      if(event.touches.length > 1 || event.scale && event.scale !== 1)
        return;

      var touch = event.touches[0];

      touchDelta = {
        x: touch.pageX - touchStart.x,
        y: touch.pageY - touchStart.y,
      };

      if(isScrolling === undefined) {
        isScrolling = !!(Math.abs(touchDelta.y) > Math.abs(touchDelta.x));
      }

      if(isScrolling) {
        isDragging = false;
        return;
      }
      
      var offset = (-touchDelta.x / containerWidth) + initialOffset;

      offset = offset > 1 ? 1
             : offset < -1 ? -1
             : offset;

      var resistance = 1;
      if((offset < 0 && !this.slides.left) || (offset > 0 && !this.slides.right)) {
        resistance = 1 / Math.sqrt(Math.abs(offset * containerWidth));
      }
      
      this.move(offset * resistance);
    },

    onTouchEnd: function(event) {
      if(isScrolling) {
        isDragging = false;
        return;
      }

      var offset = (-touchDelta.x / containerWidth) + initialOffset;

      var isSlide = (Math.abs(offset) > 0.5) ||
                          ((event.timeStamp || +new Date()) - touchStart.time < 250 && Math.abs(touchDelta.x) > 20);

      var item, transition;
      if(isSlide && offset < 0 && this.slides.left) {
        item = this.slides.left.item;
        transition = offset <= -1 ? null : -1;
      }

      else if(isSlide && offset > 0 && this.slides.right) {
        item = this.slides.right.item;
        transition = offset >= 1 ? null : 1;
      } 
      
      else if(Math.abs(offset) > 0) {
        item = this.slides.center.item;
        transition = 0;
      }

      else {
        item = this.slides.center.item;
        transition = null;
      }

      if(transition !== null) {
        this.transition(transition, function() {
          this.select(item);
        });
      } else {
        this.select(item);
      }

      isDragging = false;
    },

    isDragging: function() {
      return isDragging;
    }

  }

};

angular.module('swiperRepeat', ['ng'])

  .directive('swiperRepeat', ['$parse', function($parse) {

    var DEFAULTS = {
      preventDefault: true,
      stopPropagation: false,
      prerender: false,
      retranslator: null,
      disableTouch: false
    };

    return {
      restrict: 'A',
      transclude: 'element',
      priority: 1000,
      terminal: true,
      link: function($scope, $element, $attrs, ctrl, $transclude) {

        var expression = $attrs.swiperRepeat || '',
            match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)\s*$/),
            selectedExp = $attrs.swiperRepeatSelected ? $attrs.swiperRepeatSelected : null,
            setSelectedFn = selectedExp ? $parse(selectedExp).assign : null,
            optionsFn = $attrs.swiperRepeatOptions ? $parse($attrs.swiperRepeatOptions) : null,
            options = angular.copy(DEFAULTS);

        optionsFn && angular.extend(options, optionsFn($scope));

        if (!match) {
          throw new Error("Expected expression in form of '_item_ in _collection_' but got " + expression + ".");
        }

        var itemExp = match[1],
            collectionExp = match[2],
            swiper = {},
            needsDigest = false;


        var container = angular.element('<div style="position:relative;width:100%;height:100%;"></div>');
        $element.after(container);


        function slideFactory(item) {
          var scope = $scope.$new();
          scope[itemExp] = item;

          var element = $transclude(scope, function(clone) {
            container.append(clone);
          });

          needsDigest = true;

          return {

            element: element,
            item: item,
            
            destroy: function() {
              scope.$destroy();
              element.remove();
              needsDigest = true;
            }

          }
        }

        function select(value) {
          setSelectedFn && setSelectedFn($scope, value);
          needsDigest = true;
        }

        function $digest(fn, args) {
          needsDigest = false;
          fn.apply(swiper, args);
          if(needsDigest) {
            $scope.$digest();
            needsDigest = false;
          }
        }


        angular.extend(swiper, 
          Polyfill(), 
          Container(container), 
          Renderer(options.retranslator),
          State(select),
          Touch(),
          Api(),
          options.prerender ? RendererFull(slideFactory) : RendererPart(slideFactory)
        );

        if(!options.disableTouch) {
          container.on('touchstart', touchEventHandler(swiper.onTouchStart));
          container.on('touchmove', touchEventHandler(swiper.onTouchMove));
          container.on('touchend', touchEventHandler(swiper.onTouchEnd));  
        }
        
        function touchEventHandler(fn) {
          return function(event) {
            options.preventDefault && event.preventDefault();
            options.stopPropagation && event.stopPropagation();
            $digest(fn, arguments);
          }
        }


        container.on(swiper.TRANSITIONEND_EVENT, function(event) {
          if(event.target !== container[0]) {
            return;
          }
          event.stopPropagation();
          $digest(swiper.onTransitionEnd, arguments);      
        });


        var changes = {}, 
            actionScheduled = false;

        function scheduleAsyncAction() {
          if(!actionScheduled) {
            $scope.$evalAsync(function() {
              swiper.applyChanges(changes);
              actionScheduled = false;
              changes = {};
            });
            actionScheduled = true;
          }
        }

        $scope.$watchCollection(collectionExp, function(value) {
          changes.collection = value;
          scheduleAsyncAction();
        });

        if(selectedExp) {
          $scope.$watch(selectedExp, function(value) {
            changes.selected = value;
            scheduleAsyncAction();
          });
        }
      }
    }
  }]);
})(angular, window, document);
